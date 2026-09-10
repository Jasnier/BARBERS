export const APP_NAME = import.meta.env.VITE_APP_NAME || "BarberPro";
export const GAS_URL = import.meta.env.VITE_GAS_URL || "";

export const DAYS_OF_WEEK = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
] as const;

export const SERVICE_CATEGORIES = [
  { value: "corte", label: "Corte" },
  { value: "barba", label: "Barba" },
  { value: "paquete", label: "Paquete" },
  { value: "tratamiento", label: "Tratamiento" },
  { value: "otro", label: "Otro" },
] as const;

export const APPOINTMENT_STATUSES = [
  { value: "pending", label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  { value: "confirmed", label: "Confirmada", color: "bg-blue-100 text-blue-800" },
  { value: "in_progress", label: "En progreso", color: "bg-purple-100 text-purple-800" },
  { value: "completed", label: "Completada", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelada", color: "bg-red-100 text-red-800" },
  { value: "no_show", label: "No asistió", color: "bg-gray-100 text-gray-800" },
] as const;
