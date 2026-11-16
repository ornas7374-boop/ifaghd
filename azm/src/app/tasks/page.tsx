import type { Metadata } from "next";
import { TasksView } from "@/components/tasks/TasksView";

export const metadata: Metadata = { title: "المهام — عَزم" };

export default function Page() {
  return <TasksView />;
}
