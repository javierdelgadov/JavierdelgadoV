/**
 * Definiciones de tipos para el sistema de gestión académica I.E. Julia Restrepo.
 */

export interface Student {
  id: string;
  name: string;
  externalId?: string;
  attendance: { [date: string]: boolean }; // YYYY-MM-DD -> presente
  grades: { [subject: string]: number };
}

export interface Course {
  id: string;
  name: string;
  description: string;
  weeks: number; // Duración del periodo académico
  startDate: string; // Fecha de inicio del periodo (ISO string)
  students: Student[];
  subjects: string[];
}

export interface AppState {
  courses: Course[];
  activeCourseId: string | null;
}

export enum FileType {
  IMAGE = 'IMAGE',
  PDF = 'PDF',
  EXCEL = 'EXCEL'
}