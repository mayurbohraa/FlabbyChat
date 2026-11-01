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
          setTeams(data.teams || {});
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
        members: { [user.id]: { id: user.id, name: user.name } },
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
    async importBatch(operations) {
      if (demo)
        await local((d) => {
          for (const op of operations) {
            const target = op.teamId
              ? d.teams[op.teamId]
              : d.library || (d.library = {});
            target[op.collection] = {
              ...target[op.collection],
              [op.id]: op.value,
            };
          }
        });
      else await cloud.importRecords(user.id, operations);
    },
    async addMember(teamId, member) {
      if (demo)
        await local((d) => {
          d.teams[teamId].members[member.id] = {
            id: member.id,
            name: member.name,
          };
        });
      else await cloud.addTeamMember(teamId, member);
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
