import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import ActionMenu from "../components/ActionMenu.jsx";
afterEach(cleanup);
it("supports keyboard navigation, dismissal and selection", () => {
  const select = vi.fn();
  render(
    <ActionMenu
      label="Item actions"
      actions={[
        { label: "Reply", onSelect: select },
        { label: "Delete", onSelect: vi.fn() },
      ]}
    />,
  );
  fireEvent.click(screen.getByLabelText("Item actions"));
  expect(screen.getByRole("menuitem", { name: "Reply" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "ArrowDown" });
  expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Item actions")).toHaveFocus();
  fireEvent.click(screen.getByLabelText("Item actions"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Reply" }));
  expect(select).toHaveBeenCalledOnce();
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
