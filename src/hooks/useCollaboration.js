import { useEffect, useState } from "react";
import * as cloud from "../services/cloud.js";
import { loadDemo, saveDemo, uid, friendlyError } from "../utils/chat-data.js";

export default function useCollaboration(user, demo) {
  const [teams, setTeams] = useState({}),
    [library, setLibrary] = useState({ files: {}, folders: {} }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!demo);

  useEffect(() => {
    if (demo) {
      const sync = () => {
        try {
          const data = loadDemo();
          setTeams(
            Object.fromEntries(
              Object.entries(data.teams || {}).filter(
                ([, team]) =>
                  team.members?.[user.id] &&
                  team.members[user.id].status !== "on hold",
              ),
            ),
          );
          setLibrary(data.library || { files: {}, folders: {} });
        } catch (err) {
          setError(friendlyError(err));
        }
      };
      sync();
      window.addEventListener("flabbychat:demo", sync);
      return () => window.removeEventListener("flabbychat:demo", sync);
    }
    const fail = (err) => {
      setError(friendlyError(err));
      setLoading(false);
    };
    const a = cloud.watchTeams(
        user.id,
        (value) => {
          setTeams(value);
          setLoading(false);
        },
        fail,
      ),
      b = cloud.watchPersonal(user.id, setLibrary, fail);
    return () => {
      a();
      b();
    };
  }, [user.id, demo]);

  // Demo mutations stay in browser storage and notify the same-tab subscribers.
  async function local(fn) {
    const data = loadDemo();
    fn(data);
    saveDemo(data);
  }

  return {
    teams,
    library,
    error,
    loading,
    clearError: () => setError(""),
    async createTeam(name) {
      const id = uid(),
        workspace = uid();
      const team = {
        id,
        name,
        owner: user.id,
        createdAt: Date.now(),
        members: {
          [user.id]: {
            id: user.id,
            name: user.name,
            status: "active",
            joinedAt: Date.now(),
          },
        },
        workspaces: {
          [workspace]: {
            id: workspace,
            name: "General project",
            description: "",
            createdAt: Date.now(),
          },
        },
      };
      if (demo)
        await local((d) => {
          d.teams = { ...d.teams, [id]: team };
        });
      else await cloud.createTeam(team);
      return id;
    },
    async write(teamId, collection, id, value) {
      if (demo)
        await local((d) => {
          const target = teamId
            ? d.teams[teamId]
            : d.library || (d.library = {});
          target[collection] = { ...target[collection] };
          const parts = id.split("/");
          let record = target[collection];
          for (const part of parts.slice(0, -1)) {
            record[part] = { ...record[part] };
            record = record[part];
          }
          const key = parts.at(-1);
          if (value === null) delete record[key];
          else record[key] = value;
        });
      else if (teamId) await cloud.writeTeam(teamId, collection, id, value);
      else await cloud.writePersonal(user.id, collection, id, value);
    },
    async addMember(teamId, member) {
      if (demo)
        await local((d) => {
          d.teams[teamId].members[member.id] = {
            id: member.id,
            name: member.name,
            status: "active",
            joinedAt: Date.now(),
          };
        });
      else await cloud.addTeamMember(teamId, member);
    },
    // Match the cloud operation with one persisted mutation in demo mode.
    async transferFile(sourceTeamId, destinationTeamId, sourceId, file, move) {
      if (demo)
        await local((data) => {
          const source = sourceTeamId ? data.teams[sourceTeamId] : data.library;
          const destination = destinationTeamId
            ? data.teams[destinationTeamId]
            : data.library;
          if (!source?.files?.[sourceId] || !destination)
            throw new Error(
              "This library is no longer available. Refresh and try again.",
            );
          destination.files = { ...destination.files, [file.id]: file };
          if (move && (source !== destination || sourceId !== file.id))
            delete source.files[sourceId];
        });
      else
        await cloud.transferLibraryFile(
          user.id,
          sourceTeamId,
          destinationTeamId,
          sourceId,
          file,
          move,
        );
    },
    async transferOwnership(teamId, id) {
      if (demo)
        await local((d) => {
          const team = d.teams[teamId];
          if (team.owner !== user.id)
            throw new Error("Only the current owner can transfer ownership.");
          if (
            id === user.id ||
            !team.members?.[id] ||
            team.members[id].status === "on hold"
          )
            throw new Error("Choose another active team member.");
          team.owner = id;
        });
      else await cloud.transferTeamOwnership(teamId, id);
    },
    async setMemberStatus(teamId, id, status) {
      if (!["active", "on hold"].includes(status))
        throw new Error("Choose a valid member status.");
      if (demo)
        await local((d) => {
          const team = d.teams[teamId];
          if (team.owner !== user.id || id === team.owner)
            throw new Error(
              "Only the owner can update another member's access.",
            );
          team.members[id] = { ...team.members[id], status };
        });
      else await cloud.setTeamMemberStatus(teamId, id, status);
    },
    async removeMember(teamId, id) {
      if (demo)
        await local((d) => {
          delete d.teams[teamId].members[id];
        });
      else await cloud.removeTeamMember(teamId, id);
    },
  };
}
