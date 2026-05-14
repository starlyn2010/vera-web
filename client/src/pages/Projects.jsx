import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, FolderKanban, Calendar, ArrowUpRight, Loader2, MapPin, Target, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import Dialog from '../components/Dialog';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';

const Projects = () => {
    const { addNotification } = useNotification();
    const { user } = useAuth();
    const isAdmin = user?.rol === 'admin';
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectSummary, setProjectSummary] = useState("");
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [newProject, setNewProject] = useState({
        nombre: '',
        departamento: '',
        estado: 'Pendiente',
        fecha_inicio: new Date().toISOString().split('T')[0]
    });

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/projects');
            setProjects(response.data);
        } catch (error) {
            console.error('Error fetching projects:', error);
            addNotification('Error al cargar la lista de proyectos', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/projects', newProject);
            await fetchProjects();
            setIsModalOpen(false);
            setNewProject({
                nombre: '',
                departamento: '',
                estado: 'Pendiente',
                fecha_inicio: new Date().toISOString().split('T')[0]
            });
            addNotification('Proyecto iniciado exitosamente', 'success');
        } catch (error) {
            addNotification('Error al crear proyecto: ' + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (estado) => {
        switch (estado) {
            case 'Completado': return 'text-leaf-400 bg-leaf-400/10 border-leaf-400/20';
            case 'En Progreso': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            default: return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
        }
    };

    const handleOpenDetails = async (project) => {
        setSelectedProject(project);
        setProjectSummary("");
        setIsGeneratingSummary(true);
        try {
            const prompt = `Actúa como Analista de Proyectos. Escribe un resumen ejecutivo breve (máximo 3 líneas) para el proyecto llamado "${project.nombre}" del área de "${project.departamento}". Su estado actual es "${project.estado}" y comenzó el ${new Date(project.fecha_inicio).toLocaleDateString()}. Describe qué debería enfocarse este proyecto y sugiere un próximo paso lógico según su estado.`;
            const response = await api.post('/chatbot/message', { message: prompt });
            setProjectSummary(response.data.reply);
        } catch (error) {
            console.error(error);
            setProjectSummary(`La iniciativa "${project.nombre}" impulsada por el área de ${project.departamento || 'Operaciones'} requiere atención. (Error de conexión con Jud)`);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const filteredProjects = projects.filter(project => 
        project.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.departamento.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && projects.length === 0) return (
        <div className="h-screen bg-bg-void flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-leaf-700 border-t-leaf-400 rounded-full animate-spin" aria-label="Cargando"></div>
            <p className="mt-4 text-leaf-400 font-display animate-pulse">Analizando Iniciativas...</p>
        </div>
    );

    return (
        <div className="p-10 font-body bg-bg-void min-h-screen text-text-primary relative">
            <header className="flex justify-between items-center mb-12">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-leaf-400/60 font-bold mb-2">Gestión de Iniciativas</p>
                    <h2 className="text-4xl font-display font-bold">Proyectos Ambientales</h2>
                </motion.div>
                {isAdmin && (
                <button 
                    onClick={() => setIsModalOpen(true)}
                    aria-label="Nuevo Proyecto"
                    className="bg-leaf-400 text-forest-void px-6 py-3 rounded-xl font-bold text-[13px] flex items-center gap-2 hover:scale-105 transition-all shadow-glow active:scale-95"
                >
                    <Plus size={18} /> Nuevo Proyecto
                </button>
                )}
            </header>

            <div className="flex gap-4 mb-10">
                <div className="flex-1 bg-forest-elevated/50 border border-leaf-900/30 rounded-2xl flex items-center px-6 focus-within:border-leaf-400/40 transition-all shadow-inner">
                    <Search className="text-leaf-400/40" size={20} />
                    <input 
                        type="text" 
                        aria-label="Buscar proyectos"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar proyectos por nombre o departamento..." 
                        className="w-full bg-transparent p-4 outline-none text-sm text-text-primary placeholder:text-text-tertiary" 
                    />
                </div>
                <button 
                    aria-label="Filtrar proyectos"
                    className="glass px-6 rounded-2xl flex items-center gap-2 font-bold text-xs text-leaf-400 hover:bg-forest-hover transition-all"
                >
                    <Filter size={18} /> Filtrar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProjects.map((project, index) => (
                    <motion.div 
                        key={project.id_proyecto} 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-forest-elevated rounded-[32px] p-8 border border-leaf-900/20 shadow-xl hover:border-leaf-400/30 transition-all duration-500 group relative overflow-hidden"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${getStatusColor(project.estado)}`}>
                                {project.estado}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-bold">
                                <Calendar size={12} className="text-leaf-400/40" />
                                {new Date(project.fecha_inicio).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-2xl font-display font-bold text-text-primary mb-2 group-hover:text-leaf-400 transition-colors leading-tight">
                                {project.nombre}
                            </h3>
                            <p className="text-xs text-text-secondary flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-leaf-400 rounded-full"></span> 
                                {project.departamento}
                            </p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-6 border-t border-leaf-900/20">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-9 h-9 rounded-xl border-2 border-forest-elevated bg-forest-primary overflow-hidden shadow-sm">
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-leaf-400/50 bg-leaf-900/10 uppercase">
                                            {project.nombre.charAt(0)}
                                        </div>
                                    </div>
                                ))}
                                <div className="w-9 h-9 rounded-xl border-2 border-forest-elevated bg-leaf-900 text-[10px] font-black text-leaf-400 flex items-center justify-center">
                                    +5
                                </div>
                            </div>
                            <button 
                                onClick={() => handleOpenDetails(project)}
                                aria-label={`Ver detalles del proyecto ${project.nombre}`}
                                className="text-leaf-400 text-xs font-bold flex items-center gap-1.5 group/btn"
                            >
                                Detalles <ArrowUpRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredProjects.length === 0 && !loading && (
                <div className="mt-20 flex flex-col items-center justify-center text-leaf-400/20">
                    <FolderKanban size={80} className="mb-4" />
                    <p className="text-xl font-display italic">No se encontraron proyectos coincidentes.</p>
                </div>
            )}

            {/* CREATION MODAL */}
            <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Iniciar Proyecto Ambiental">
                <form onSubmit={handleCreate} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="proj-name" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Nombre del Proyecto</label>
                        <input 
                            id="proj-name"
                            required
                            type="text" 
                            className="w-full bg-bg-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                            placeholder="Ej: Reforestación Sector Norte"
                            value={newProject.nombre}
                            onChange={(e) => setNewProject({...newProject, nombre: e.target.value})}
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="proj-dept" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Departamento / Área</label>
                        <input 
                            id="proj-dept"
                            required
                            type="text" 
                            className="w-full bg-bg-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                            placeholder="Ej: Gestión de Residuos"
                            value={newProject.departamento}
                            onChange={(e) => setNewProject({...newProject, departamento: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="proj-date" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Fecha de Inicio</label>
                            <input 
                                id="proj-date"
                                required
                                type="date" 
                                className="w-full bg-bg-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                                value={newProject.fecha_inicio}
                                onChange={(e) => setNewProject({...newProject, fecha_inicio: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="proj-status" className="text-[10px] font-bold uppercase text-leaf-400/60 tracking-widest ml-1">Estado Inicial</label>
                            <select 
                                id="proj-status"
                                className="w-full bg-bg-void border border-leaf-900/30 p-4 rounded-xl outline-none text-text-primary focus:border-leaf-400/50 transition-all"
                                value={newProject.estado}
                                onChange={(e) => setNewProject({...newProject, estado: e.target.value})}
                            >
                                <option>Pendiente</option>
                                <option>En Progreso</option>
                                <option>Completado</option>
                            </select>
                        </div>
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-leaf-400 text-forest-void font-bold py-4 rounded-2xl hover:bg-leaf-300 transition-all shadow-glow mt-4 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Inicio de Proyecto'}
                    </button>
                </form>
            </Dialog>

            <Dialog isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} title={selectedProject?.nombre || 'Detalle del Proyecto'}>
                {selectedProject && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-forest-void/50 border border-leaf-900/20 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black flex items-center gap-2"><Target size={12} /> Estado</p>
                                <p className="font-bold text-text-primary mt-1">{selectedProject.estado}</p>
                            </div>
                            <div className="bg-forest-void/50 border border-leaf-900/20 p-4 rounded-2xl">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black flex items-center gap-2"><Calendar size={12} /> Inicio</p>
                                <p className="font-bold text-text-primary mt-1">{new Date(selectedProject.fecha_inicio).toLocaleDateString()}</p>
                            </div>
                            <div className="bg-forest-void/50 border border-leaf-900/20 p-4 rounded-2xl col-span-2">
                                <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black flex items-center gap-2"><MapPin size={12} /> Departamento</p>
                                <p className="font-bold text-text-primary mt-1">{selectedProject.departamento}</p>
                            </div>
                        </div>

                        <div className="bg-forest-void/30 border border-leaf-900/20 p-5 rounded-2xl min-h-[100px] relative">
                            <p className="text-[10px] uppercase tracking-widest text-leaf-400/50 font-black mb-3 flex items-center gap-2"><Leaf size={12} /> Análisis de Jud Engine</p>
                            
                            {isGeneratingSummary ? (
                                <div className="flex items-center gap-3 text-leaf-400/60 animate-pulse">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-xs font-bold">Jud está procesando los datos de la iniciativa...</span>
                                </div>
                            ) : (
                                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                                    {projectSummary}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default Projects;
