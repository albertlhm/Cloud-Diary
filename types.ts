export interface Calendar {
  id: string;
  name: string;
  colorIndex: number;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  priority: number;
}

export interface Theme {
  name: string;
  bg: string;
  sidebar: string;
  sidebarText: string;
  sidebarActive: string;
  header: string;
  card: string;
  text: string;
  subText: string;
  border: string;
  dayBg: string;
  dayHover: string;
  lockBg: string;
}

export interface EntryData {
  [date: string]: string;
}

export interface AllEntries {
  [calendarId: string]: EntryData;
}

export interface ColorData {
  [date: string]: number;
}

export interface AllColors {
  [calendarId: string]: ColorData;
}

export interface AllTodos {
  [calendarId: string]: Todo[];
}

export interface UserData {
    calendars: Calendar[];
    todos: AllTodos;
    entryColors: AllColors;
    themeMode: string;
}