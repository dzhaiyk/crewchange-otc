import { ExceptionType, Role } from "@prisma/client";

export interface AssignmentView {
  id: string;
  role: Role;
  personId: string;
  personName: string;
  startDate: string;
  endDate: string;
}

export interface CrewChangeView {
  role: Role;
  date: string;
  outgoingPersonId: string;
  outgoingName: string;
  incomingPersonId: string;
  incomingName: string;
}

export interface DashboardData {
  today: string;
  timezoneNote: string;
  currentCrew: Array<{ role: Role; personId: string; name: string }>;
  upcomingChanges: CrewChangeView[];
  warnings: string[];
}

export interface ExceptionPayload {
  type: ExceptionType;
  role: Role;
  plannedDate: string;
  requestedDate?: string;
  reason: string;
}
