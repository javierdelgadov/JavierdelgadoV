
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Plus, 
  Trash2, 
  FileUp, 
  Download, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  GraduationCap,
  ChevronLeft,
  ClipboardList,
  UserPlus,
  Clock,
  Settings,
  Check,
  DownloadCloud,
  UploadCloud,
  ShieldCheck,
  PieChart,
  HelpCircle
} from 'lucide-react';
import { Course, Student } from './types.ts';
import { parseStudentFile } from './services/geminiService.ts';

const STORAGE_KEY = 'julia_restrepo_v5_final';
const TEACHER_NAME_KEY = 'julia_teacher_name';
const SYNC_URL_KEY = 'julia_sync_url';

const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00');
  const month = date.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  const day = date.getDate();
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${day}`;
};

const calculateCurrentWeek = (startDate: string, totalWeeks: number) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const week = Math.ceil(diffDays / 7);
  return diffDays < 0 ? 0 : (week > totalWeeks ? totalWeeks : (week || 1));
};

const Modal = ({ isOpen, onClose, title, children, footer }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white max-w-lg w-full rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto max-h-[70vh]">{children}</div>
        {footer && <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">{footer}</div>}
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 ${
      active ? 'bg-blue-700 text-white shadow-xl translate-x-1' : 'text-slate-500 hover:bg-slate-100'
    }`}
  >
    <Icon size={20} className="shrink-0" />
    <span className="font-black text-sm uppercase tracking-wide truncate">{label}</span>
  </button>
);

const App = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teacherName, setTeacherName] = useState('Docente Julia');
  const [syncUrl, setSyncUrl] = useState('');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'attendance' | 'stats'>('attendance');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseWeeks, setNewCourseWeeks] = useState(13);
  const [newCourseStartDate, setNewCourseStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStudentName, setNewStudentName] = useState('');

  const LEMA = "Somos los mejores y buscamos la excelencia";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTeacher = localStorage.getItem(TEACHER_NAME_KEY);
    const savedSyncUrl = localStorage.getItem(SYNC_URL_KEY);
    if (saved) {
      try {
        setCourses(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading storage:", e);
      }
    }
    if (savedTeacher) setTeacherName(savedTeacher);
    if (savedSyncUrl) setSyncUrl(savedSyncUrl);
  }, []);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(courses)); }, [courses]);
  useEffect(() => { localStorage.setItem(TEACHER_NAME_KEY, teacherName); }, [teacherName]);
  useEffect(() => { localStorage.setItem(SYNC_URL_KEY, syncUrl); }, [syncUrl]);

  const activeCourse = useMemo(() => courses.find(c => c.id === activeCourseId) || null, [courses, activeCourseId]);

  const recordedDates = useMemo(() => {
    if (!activeCourse) return [];
    const datesSet = new Set<string>();
    activeCourse.students.forEach(s => {
      if (s.attendance) Object.keys(s.attendance).forEach(d => datesSet.add(d));
    });
    return Array.from(datesSet).sort();
  }, [activeCourse]);

  const stats = useMemo(() => {
    if (!activeCourse || !activeCourse.students.length) return null;
    const totalClassesDictated = recordedDates.length;
    
    const studentSummary = activeCourse.students.map(s => {
      const att = s.attendance || {};
      const absencesList = Object.keys(att).filter(d => att[d] === false).sort();
      const rate = totalClassesDictated > 0 ? (absencesList.length / totalClassesDictated) * 100 : 0;
      
      return {
        id: s.id,
        name: s.name,
        absencesCount: absencesList.length,
        absencesDates: absencesList,
        absenceRate: rate
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return { studentSummary, totalClasses: totalClassesDictated };
  }, [activeCourse, recordedDates]);

  const syncWithCloud = async (studentName: string, date: string, status: boolean, courseName: string) => {
    if (!syncUrl || !syncUrl.includes('/exec')) return;
    setSyncStatus('syncing');
    try {
      const payload = { docente: teacherName, curso: courseName, estudiante: studentName, fecha: date, asistio: status ? 'SÍ' : 'NO' };
      await fetch(syncUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      setSyncStatus('error');
    }
  };

  const toggleAttendance = useCallback(async (studentId: string, date: string) => {
    if (!activeCourse) return;
    let sName = "";
    let nextStatus = false;
    setCourses(prev => prev.map(c => {
      if (c.id !== activeCourseId) return c;
      const updatedStudents = c.students.map(s => {
        if (s.id !== studentId) return s;
        sName = s.name;
        nextStatus = !s.attendance?.[date];
        return { ...s, attendance: { ...s.attendance, [date]: nextStatus } };
      });
      return { ...c, students: updatedStudents };
    }));
    if (syncUrl) syncWithCloud(sName, date, nextStatus, activeCourse.name);
  }, [activeCourseId, activeCourse, syncUrl, teacherName]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeCourseId) return;
    setLoadingAction('Analizando con IA...');
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const parsed = await parseStudentFile(content, file.type);
      if (parsed && parsed.length > 0) {
        setCourses(prev => prev.map(c => 
          c.id === activeCourseId ? { 
            ...c, 
            students: [...c.students, ...parsed.map(s => ({ 
              id: Math.random().toString(36).substring(2, 11), 
              name: s.name, 
              attendance: {}, 
              grades: {} 
            }))] 
          } : c
        ));
      }
      setLoadingAction(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCourse = () => {
    if (!newCourseName.trim()) return;
    const newCourse: Course = { 
      id: Math.random().toString(36).substring(2, 11), 
      name: newCourseName, 
      description: '', 
      weeks: newCourseWeeks, 
      startDate: newCourseStartDate, 
      students: [], 
      subjects: [] 
    };
    setCourses(prev => [...prev, newCourse]);
    setNewCourseName('');
    setShowAddCourse(false);
    setActiveCourseId(newCourse.id);
  };

  const handleAddStudent = () => {
    if (!newStudentName.trim() || !activeCourseId) return;
    const newStudent: Student = { 
      id: Math.random().toString(36).substring(2, 11), 
      name: newStudentName, 
      attendance: {}, 
      grades: {} 
    };
    setCourses(prev => prev.map(c => 
      c.id === activeCourseId ? { ...c, students: [...c.students, newStudent] } : c
    ));
    setNewStudentName('');
    setShowAddStudent(false);
  };

  const deleteCourse = (id: string) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    if (activeCourseId === id) setActiveCourseId(null);
    setIsDeleting(null);
  };

  const exportToExcel = () => {
    if (!activeCourse) return;
    const data = activeCourse.students.map((s, idx) => {
      const studentStat = stats?.studentSummary.find(st => st.id === s.id);
      const isCritical = studentStat && studentStat.absenceRate >= 20;
      return {
        'Nº': idx + 1,
        'ESTUDIANTE': s.name,
        'CLASES REGISTRADAS': recordedDates.length,
        'TOTAL FALTAS': studentStat?.absencesCount || 0,
        '% INASISTENCIA': `${studentStat?.absenceRate.toFixed(1)}%`,
        'ESTADO': isCritical ? 'RIESGO DE REPROBACIÓN' : 'AL DÍA',
        'FECHAS DE FALTAS': studentStat?.absencesDates.map(d => formatShortDate(d)).join(', ') || 'Sin faltas'
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriz_Final");
    XLSX.writeFile(wb, `Asistencia_${activeCourse.name}_${selectedDate}.xlsx`);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <aside className={`${sidebarOpen ? 'w-80' : 'w-0 -ml-80'} transition-all duration-500 bg-white border-r border-slate-100 flex flex-col shadow-2xl shrink-0 overflow-hidden`}>
        <div className="p-10 border-b border-slate-50">
          <div className="flex items-center gap-4 text-blue-700">
            <div className="p-3 bg-blue-50 rounded-2xl"><GraduationCap size={32} /></div>
            <div>
               <span className="text-[10px] font-black uppercase text-slate-400">Plataforma</span>
               <h1 className="text-xl font-black text-slate-800 -mt-1">JULIA RESTREPO</h1>
            </div>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          <SidebarItem icon={LayoutDashboard} label="Inicio" active={activeCourseId === null} onClick={() => setActiveCourseId(null)} />
          <div className="pt-8 pb-3 px-5 text-[10px] font-black text-slate-300 uppercase tracking-widest">GRUPOS</div>
          {courses.map(c => (
            <div key={c.id} className="group relative">
              <SidebarItem icon={Users} label={c.name} active={activeCourseId === c.id} onClick={() => setActiveCourseId(c.id)} />
              <button onClick={() => setIsDeleting(c.id)} className="absolute right-4 top-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
            </div>
          ))}
          <button onClick={() => setShowAddCourse(true)} className="w-full flex items-center justify-center gap-3 py-5 mt-8 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-[1.5rem] border border-blue-200 border-dashed font-black uppercase text-sm">
            <Plus size={20} /> Nuevo Grupo
          </button>
        </div>

        <div className="p-8 border-t border-slate-50 text-center">
            <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest italic opacity-70">"{LEMA}"</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 text-slate-500 hover:bg-slate-50 rounded-[1.5rem] border border-slate-100">
              {sidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
            </button>
            <h2 className="text-2xl font-black text-slate-800">{activeCourse ? activeCourse.name : 'Panel del Docente'}</h2>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
               <p className="text-[11px] font-black text-slate-800 uppercase">{teacherName}</p>
               <span className={`text-[9px] font-black uppercase ${syncStatus === 'success' ? 'text-emerald-500' : 'text-slate-400'}`}>
                 {syncStatus === 'success' ? 'Sincronizado' : 'Modo Offline'}
               </span>
             </div>
             <button onClick={() => setShowSettings(true)} className="p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 transition-all"><Settings size={22} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 space-y-10">
          {!activeCourse ? (
            <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
              <div className="w-24 h-24 bg-blue-700 text-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl"><GraduationCap size={48}/></div>
              <h3 className="text-4xl font-black text-slate-800">¡Bienvenido(a), {teacherName.split(' ')[0]}!</h3>
              <p className="text-lg text-slate-500 font-medium">Gestione la asistencia y busque la excelencia académica.</p>
              <button onClick={() => setShowAddCourse(true)} className="px-10 py-5 bg-blue-700 text-white rounded-[1.8rem] font-black uppercase text-sm shadow-xl shadow-blue-200">Crear Primer Grupo</button>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-6">
                  <div className="p-5 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Calendar size={32}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Semana</p><p className="font-black text-slate-800 text-lg">{calculateCurrentWeek(activeCourse.startDate, activeCourse.weeks)} / {activeCourse.weeks}</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-6">
                  <div className="p-5 bg-rose-50 text-rose-600 rounded-[1.5rem]"><AlertTriangle size={32}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Riesgo</p><p className="font-black text-rose-600 text-lg">{stats?.studentSummary.filter(st => st.absenceRate >= 20).length} Alumnos</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-6">
                  <div className="p-5 bg-emerald-50 text-emerald-600 rounded-[1.5rem]"><CheckCircle size={32}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clases Dictadas</p><p className="font-black text-emerald-600 text-lg">{recordedDates.length} Sesiones</p></div>
                </div>
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center gap-6">
                  <div className="p-5 bg-indigo-50 text-indigo-600 rounded-[1.5rem]"><Users size={32}/></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Matrícula</p><p className="font-black text-slate-800 text-lg">{activeCourse.students.length} Estudiantes</p></div>
                </div>
              </div>

              <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm w-fit">
                <button onClick={() => setViewMode('attendance')} className={`px-8 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-wider transition-all ${viewMode === 'attendance' ? 'bg-blue-700 text-white shadow-xl' : 'text-slate-400 hover:text-slate-700'}`}>Asistencia Diaria</button>
                <button onClick={() => setViewMode('stats')} className={`px-8 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-wider transition-all ${viewMode === 'stats' ? 'bg-blue-700 text-white shadow-xl' : 'text-slate-400 hover:text-slate-700'}`}>Matriz de Control</button>
              </div>

              {viewMode === 'attendance' && (
                <div className="space-y-8 animate-fade-in">
                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4 bg-slate-50 px-8 py-5 rounded-[2rem] border border-slate-100 w-full md:w-auto">
                      <Calendar size={24} className="text-blue-700" />
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none font-black text-blue-900 outline-none text-lg" />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                      <label className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-blue-700 text-white font-black uppercase rounded-[1.8rem] hover:bg-blue-800 cursor-pointer text-[11px] shadow-lg transition-all active:scale-95">
                        <FileUp size={20} /> Importar Lista IA
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <button onClick={() => setShowAddStudent(true)} className="p-5 bg-white border border-slate-200 text-slate-500 rounded-[1.8rem] hover:text-blue-700 hover:border-blue-200 shadow-sm active:scale-95"><UserPlus size={24} /></button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-[3.5rem] shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest">Estudiante</th>
                          <th className="px-12 py-8 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center w-48">Registro Hoy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {activeCourse.students.map((s, idx) => {
                          const isPresent = s.attendance?.[selectedDate] ?? true;
                          return (
                            <tr key={s.id} className="hover:bg-blue-50/20 transition-all group">
                              <td className="px-12 py-8">
                                <div className="flex items-center gap-6">
                                  <span className="text-[10px] font-black text-slate-300 group-hover:text-blue-400">{String(idx + 1).padStart(2, '0')}</span>
                                  <span className="font-black text-slate-800 text-xl tracking-tight">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-12 py-8 text-center">
                                <button onClick={() => toggleAttendance(s.id, selectedDate)} className={`w-full py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest border-2 transition-all ${isPresent ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 scale-105 shadow-xl shadow-rose-100'}`}>
                                  {isPresent ? 'Presente' : 'Ausente'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewMode === 'stats' && (
                <div className="bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl overflow-hidden animate-fade-in">
                  <div className="p-12 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                      <h4 className="font-black text-slate-800 text-3xl tracking-tight mb-2">Matriz Institucional</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-relaxed">Julia Restrepo • Excelencia Educativa</p>
                    </div>
                    <button onClick={exportToExcel} className="flex items-center gap-3 px-10 py-5 bg-emerald-600 text-white font-black text-[11px] uppercase rounded-[1.8rem] hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all hover:-translate-y-1">
                      <Download size={20} /> Exportar Reporte (.xlsx)
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="px-8 py-6 text-[11px] font-black text-slate-500 uppercase border-b border-r sticky left-0 bg-slate-100 z-10 w-80">Estudiante</th>
                          <th className="px-6 py-6 text-[11px] font-black text-rose-600 uppercase border-b border-r text-center w-24">Faltas</th>
                          <th className="px-6 py-6 text-[11px] font-black text-amber-600 uppercase border-b border-r text-center w-24">% Inas.</th>
                          <th className="px-6 py-6 text-[11px] font-black text-blue-600 uppercase border-b border-r text-center min-w-[250px]">Resumen Días</th>
                          {recordedDates.map(date => (
                            <th key={date} className="px-6 py-6 text-[11px] font-black text-slate-500 uppercase border-b border-r text-center min-w-[100px] bg-white">
                              {formatShortDate(date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats?.studentSummary.map((st) => {
                          const originalStudent = activeCourse.students.find(s => s.id === st.id);
                          const isCritical = st.absenceRate >= 20;
                          return (
                            <tr key={st.id} className={`${isCritical ? 'bg-rose-50/30' : ''} hover:bg-slate-50 transition-colors group`}>
                              <td className="px-8 py-6 border-r sticky left-0 bg-white z-10 shadow-sm">
                                <p className={`font-black text-base ${isCritical ? 'text-rose-700' : 'text-slate-800'}`}>{st.name}</p>
                                {isCritical && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5 block">RIESGO REPROBACIÓN</span>}
                              </td>
                              <td className={`px-6 py-6 border-r text-center font-black text-lg ${st.absencesCount > 0 ? 'text-rose-600' : 'text-slate-200'}`}>
                                {st.absencesCount}
                              </td>
                              <td className="px-6 py-6 border-r text-center">
                                <div className={`px-3 py-1.5 rounded-xl font-black text-sm ${isCritical ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-amber-100 text-amber-700'}`}>
                                  {st.absenceRate.toFixed(1)}%
                                </div>
                              </td>
                              <td className="px-6 py-6 border-r">
                                <div className="flex flex-wrap gap-2">
                                  {st.absencesDates.map(d => (
                                    <span key={d} className="px-3 py-1 bg-white text-blue-800 rounded-lg text-[10px] font-black border border-blue-100 uppercase shadow-sm">
                                      {formatShortDate(d)}
                                    </span>
                                  ))}
                                  {st.absencesDates.length === 0 && <span className="text-emerald-500 text-[10px] font-black uppercase italic">Asistencia Perfecta</span>}
                                </div>
                              </td>
                              {recordedDates.map(date => {
                                const present = originalStudent?.attendance?.[date] ?? true;
                                const hasData = originalStudent?.attendance?.hasOwnProperty(date);
                                return (
                                  <td key={date} className="px-6 py-6 border-r text-center">
                                    {hasData ? (
                                      present ? <Check size={18} className="text-emerald-300 mx-auto" /> : <X size={18} className="text-rose-600 mx-auto" />
                                    ) : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Perfil Docente" footer={<button onClick={() => setShowSettings(false)} className="w-full py-5 bg-blue-700 text-white font-black uppercase rounded-[1.5rem] shadow-xl">Guardar Cambios</button>}>
           <div className="space-y-8">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Tu Nombre:</label>
                <input type="text" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] font-bold text-lg outline-none focus:border-blue-300 transition-colors" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
              </div>
              <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-blue-800 uppercase tracking-widest">Sincronización Drive</p>
                  <button onClick={() => setShowHelp(true)} className="text-blue-700 hover:underline flex items-center gap-1 text-[10px] font-black uppercase"><HelpCircle size={14}/> Ayuda</button>
                </div>
                <input type="url" placeholder="URL de Apps Script..." className="w-full p-5 bg-white border-2 border-slate-100 rounded-[1.2rem] text-xs outline-none focus:ring-4 focus:ring-blue-100" value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} />
                <button onClick={() => syncUrl && syncWithCloud("VERIFICACIÓN", "2024-01-01", true, "SISTEMA")} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 transition-all hover:bg-blue-700">
                  {syncStatus === 'syncing' ? 'Conectando...' : 'Probar Conexión'}
                </button>
              </div>
              <button onClick={() => setShowBackup(true)} className="w-full flex items-center justify-center gap-3 p-6 bg-white border-2 border-emerald-100 text-emerald-700 rounded-[2rem] font-black uppercase text-xs hover:bg-emerald-50 transition-all">
                <ShieldCheck size={20} /> Copias de Seguridad
              </button>
           </div>
        </Modal>

        <Modal isOpen={showHelp} onClose={() => setShowHelp(false)} title="Conectar con Google Drive">
           <div className="space-y-6 text-sm">
              <div className="p-4 bg-blue-50 rounded-2xl text-blue-800 font-bold text-[11px] uppercase tracking-widest mb-4">¡Sigue estos pasos exactamente!</div>
              <ol className="space-y-4 list-decimal list-inside text-slate-600 font-medium">
                 <li>En tu Google Sheet ve a <b>Extensiones > Apps Script</b>.</li>
                 <li>Pega el código del servidor que te proporcionó el chat.</li>
                 <li>Dale a <b>Implementar > Nueva implementación</b>.</li>
                 <li>Tipo: <b>Aplicación web</b>.</li>
                 <li>Quién tiene acceso: <b>Cualquiera (Anyone)</b>.</li>
                 <li>Copia la URL que termina en <b>/exec</b> y pégala aquí.</li>
              </ol>
              <p className="text-xs text-rose-500 font-black italic">⚠️ Importante: Si editas el código en Drive, debes volver a implementar como "Nueva Versión".</p>
           </div>
        </Modal>

        <Modal isOpen={showBackup} onClose={() => setShowBackup(false)} title="Seguridad de Datos">
           <div className="grid grid-cols-1 gap-4 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck size={40} /></div>
              <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-widest leading-relaxed px-4">Sus datos se guardan en el navegador automáticamente.</p>
              <button onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(courses));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", `BACKUP_JULIA_${new Date().toISOString().split('T')[0]}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                document.body.removeChild(downloadAnchorNode);
              }} className="w-full flex items-center justify-center gap-3 p-6 bg-white border-2 border-emerald-100 text-emerald-700 rounded-[2rem] font-black uppercase text-xs hover:bg-emerald-50 transition-all">
                <DownloadCloud size={20} /> Descargar Archivo Backup
              </button>
              <label className="w-full flex items-center justify-center gap-3 p-6 bg-white border-2 border-blue-100 text-blue-700 rounded-[2rem] font-black uppercase text-xs hover:bg-blue-50 transition-all cursor-pointer">
                <UploadCloud size={20} /> Cargar Archivo Backup
                <input type="file" className="hidden" accept=".json" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    try {
                      const json = JSON.parse(e.target?.result as string);
                      if (Array.isArray(json)) { 
                        setCourses(json); 
                        alert("Datos restaurados."); 
                      }
                    } catch (err) {
                      alert("Error al parsear el archivo.");
                    }
                  };
                  reader.readAsText(file);
                }} />
              </label>
           </div>
        </Modal>

        <Modal isOpen={showAddCourse} onClose={() => setShowAddCourse(false)} title="Nuevo Grupo" footer={<button onClick={handleAddCourse} className="w-full py-5 bg-blue-700 text-white font-black uppercase rounded-[1.5rem] shadow-xl">Crear Grupo</button>}>
           <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Grado:</label>
              <input autoFocus placeholder="Ej: Castellano 10-2" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] font-black text-2xl outline-none focus:border-blue-300" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fecha Inicio:</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] font-bold" value={newCourseStartDate} onChange={(e) => setNewCourseStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Semanas:</label>
                  <input type="number" placeholder="Semanas" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.2rem] font-bold" value={newCourseWeeks} onChange={(e) => setNewCourseWeeks(parseInt(e.target.value) || 13)} />
                </div>
              </div>
           </div>
        </Modal>

        <Modal isOpen={showAddStudent} onClose={() => setShowAddStudent(false)} title="Inscribir Alumno" footer={<button onClick={handleAddStudent} className="w-full py-5 bg-blue-700 text-white font-black uppercase rounded-[1.5rem] shadow-xl">Añadir Ahora</button>}>
           <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre Completo:</label>
           <input autoFocus placeholder="Escriba el nombre..." className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] font-bold text-xl outline-none focus:border-blue-300" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
        </Modal>

        {loadingAction && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[200]">
            <div className="bg-white p-16 rounded-[4rem] shadow-2xl flex flex-col items-center">
              <Clock className="w-20 h-20 text-blue-700 animate-spin mb-10" />
              <p className="text-3xl font-black text-slate-800 uppercase tracking-widest text-center">{loadingAction}</p>
              <p className="text-sm font-bold text-slate-400 mt-4 italic uppercase tracking-widest">Excelencia Julia Restrepo</p>
            </div>
          </div>
        )}

        {isDeleting && (
          <Modal isOpen={!!isDeleting} onClose={() => setIsDeleting(null)} title="Eliminar Grupo" footer={<button onClick={() => deleteCourse(isDeleting)} className="w-full py-5 bg-rose-600 text-white font-black uppercase rounded-[1.5rem] hover:bg-rose-700 shadow-xl">Eliminar</button>}>
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32}/></div>
              <p className="font-bold text-slate-600">¿Estás seguro de eliminar este grupo permanentemente?</p>
            </div>
          </Modal>
        )}
      </main>
    </div>
  );
};

export default App;
