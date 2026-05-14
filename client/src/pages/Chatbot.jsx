import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Send, Sparkles, User } from 'lucide-react';
import gsap from 'gsap';
import api from '../services/api';
import { assetUrl } from '../utils/assetUrl';

const CHAT_STORAGE_KEY = 'clearpath_jud_chat_session';
const initialMessages = [
    {
        role: 'assistant',
        content: '¡Hola! Soy Jud, la inteligencia operativa de Clear Path. Mi enlace con Groq está activo. ¿En qué puedo asistirte hoy con inventario, pedidos o gestión ambiental?'
    }
];

const renderInlineMarkdown = (text) => {
    const input = String(text ?? '');
    const nodes = [];
    const tokenRe = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;

    while ((match = tokenRe.exec(input)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(input.slice(lastIndex, match.index));
        }

        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
            nodes.push(<strong key={`b-${match.index}`}>{token.slice(2, -2)}</strong>);
        } else if (token.startsWith('`') && token.endsWith('`')) {
            nodes.push(
                <code
                    key={`c-${match.index}`}
                    className="px-1.5 py-0.5 rounded bg-forest-void/60 border border-leaf-900/30 font-mono text-[12px]"
                >
                    {token.slice(1, -1)}
                </code>
            );
        } else {
            nodes.push(token);
        }

        lastIndex = tokenRe.lastIndex;
    }

    if (lastIndex < input.length) nodes.push(input.slice(lastIndex));
    return nodes;
};

const renderMarkdownLite = (text) => {
    const lines = String(text ?? '').split(/\r?\n/);
    const blocks = [];
    let pendingList = null;

    const flushList = () => {
        if (pendingList && pendingList.length > 0) {
            blocks.push({ type: 'list', items: pendingList });
        }
        pendingList = null;
    };

    for (const rawLine of lines) {
        const line = rawLine.replace(/\s+$/g, '');
        const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
        const headingMatch = line.match(/^\s*(#{1,3})\s+(.+)$/);

        if (headingMatch) {
            flushList();
            blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
            continue;
        }

        if (listMatch) {
            pendingList ||= [];
            pendingList.push(listMatch[1]);
            continue;
        }

        if (line.trim() === '') {
            flushList();
            blocks.push({ type: 'spacer' });
            continue;
        }

        flushList();
        blocks.push({ type: 'paragraph', text: line });
    }
    flushList();

    return (
        <div className="space-y-3">
            {blocks.map((b, idx) => {
                if (b.type === 'spacer') return <div key={`sp-${idx}`} className="h-1" />;
                if (b.type === 'heading') {
                    const cls =
                        b.level === 1
                            ? 'text-[16px] font-black'
                            : b.level === 2
                                ? 'text-[14px] font-black'
                                : 'text-[13px] font-bold';
                    return (
                        <div key={`h-${idx}`} className={cls}>
                            {renderInlineMarkdown(b.text)}
                        </div>
                    );
                }
                if (b.type === 'list') {
                    return (
                        <ul key={`l-${idx}`} className="list-disc pl-6 space-y-1.5 text-[14px]">
                            {b.items.map((it, i) => (
                                <li key={`li-${idx}-${i}`}>{renderInlineMarkdown(it)}</li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <p key={`p-${idx}`} className="text-[14px] leading-relaxed whitespace-pre-wrap">
                        {renderInlineMarkdown(b.text)}
                    </p>
                );
            })}
        </div>
    );
};

const Chatbot = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [messages, setMessages] = useState(() => {
        try {
            const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialMessages;
        } catch {
            return initialMessages;
        }
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));

        const messageEls = scrollRef.current?.querySelectorAll('.message-bubble');
        if (messageEls && messageEls.length > 0) {
            const last = messageEls[messageEls.length - 1];
            // If the message is taller than the container, align to the top of the message
            if (last.offsetHeight > scrollRef.current.offsetHeight) {
                last.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                last.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
            
            // Only animate opacity/transform if it's newly added (we can just run gsap always for the last msg)
            gsap.fromTo(
                last,
                { opacity: 0, y: 15, scale: 0.98 },
                { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }
            );
        }
    }, [messages, isLoading]);

    const promptProcessedRef = useRef(false);

    // Handle prompt from Dashboard
    useEffect(() => {
        if (location.state?.prompt && !promptProcessedRef.current) {
            const prompt = location.state.prompt;
            promptProcessedRef.current = true;
            // Clear state so it doesn't fire again on reload
            navigate(location.pathname, { replace: true, state: {} });
            
            setTimeout(() => {
                sendToJud(prompt);
            }, 300);
        }
    }, [location.state, navigate]);

    const sendToJud = async (prompt) => {
        if (!prompt.trim() || isLoading) return;

        const userMsg = { role: 'user', content: prompt };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.map((msg) => ({ role: msg.role, content: msg.content }));
            const response = await api.post('/chatbot/message', {
                message: prompt,
                history
            });

            setMessages((prev) => [...prev, { role: 'assistant', content: response.data.reply }]);
        } catch (error) {
            console.error('Error with Jud:', error);
            const detail = error.response?.data?.detail || error.response?.data?.error || error.message || 'Error desconocido';
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: `Tuve un problema de conexión con Groq: ${detail}. Intenta de nuevo en unos segundos.`,
                    isError: true
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (event) => {
        event.preventDefault();
        sendToJud(input);
    };

    return (
        <div className="flex flex-col h-screen bg-bg-void font-body relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-leaf-glow/5 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-leaf-400/5 blur-[100px] rounded-full pointer-events-none"></div>

            <header className="z-10 p-6 flex flex-col items-center border-b border-leaf-900/30 glass">
                <div className="flex items-center gap-3 bg-bg-elevated border border-leaf-400/20 px-5 py-2 rounded-full shadow-glow">
                    <div className="relative">
                        <img src={assetUrl('/logo.jpeg')} className="w-8 h-8 rounded-full object-cover border border-leaf-400/30" alt="Jud" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-leaf-glow rounded-full border-2 border-bg-elevated"></span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold tracking-widest text-leaf-400 uppercase">Clear Path · Jud</span>
                        <span className="text-[9px] text-leaf-100/50 font-medium">Powered by Groq Llama 3.3</span>
                    </div>
                </div>
            </header>

            <main ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 z-10 scroll-smooth custom-scrollbar">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex gap-4 max-w-[85%] message-bubble ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border ${
                            msg.role === 'assistant'
                                ? 'bg-bg-elevated border-leaf-400/20'
                                : 'bg-leaf-400 border-leaf-400/50 text-bg-void'
                        }`}>
                            {msg.role === 'assistant'
                                ? <img src={assetUrl('/logo.jpeg')} className="w-full h-full rounded-xl object-cover" alt="Jud" />
                                : <User size={20} />
                            }
                        </div>
                        <div className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : ''}`}>
                            <span className="text-[10px] font-bold text-leaf-400/60 uppercase tracking-tighter">
                                {msg.role === 'assistant' ? 'Jud' : 'Tu'}
                            </span>
                            <div className={`p-5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                msg.role === 'assistant'
                                    ? `glass font-display text-[16px] text-text-primary ${msg.isError ? 'border-red-500/30' : 'border-leaf-900/30'}`
                                    : 'bg-bg-elevated border border-leaf-400/10 text-text-primary'
                            }`}>
                                {msg.isError && <AlertCircle size={16} className="inline mr-2 text-red-400" />}
                                {msg.role === 'assistant' ? renderMarkdownLite(msg.content) : <span className="whitespace-pre-wrap">{msg.content}</span>}
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-4 max-w-[80%]">
                        <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-leaf-400/20 flex items-center justify-center overflow-hidden">
                            <img src={assetUrl('/logo.jpeg')} className="w-full h-full object-cover animate-pulse" alt="Jud" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-leaf-400/60 uppercase">Jud está pensando...</span>
                            <div className="flex gap-1.5 p-4 glass rounded-2xl">
                                <span className="w-1.5 h-1.5 bg-leaf-400 rounded-full animate-bounce [animation-duration:0.8s]"></span>
                                <span className="w-1.5 h-1.5 bg-leaf-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-leaf-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]"></span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="p-8 z-10 bg-gradient-to-t from-bg-void via-bg-void to-transparent">
                <form
                    onSubmit={handleSend}
                    className="max-w-4xl mx-auto flex items-center gap-3 bg-bg-elevated border border-leaf-400/20 p-2 pl-6 rounded-[24px] focus-within:border-leaf-400/50 shadow-glow transition-all duration-300"
                >
                    <input
                        type="text"
                        placeholder="Pregúntame sobre el inventario, BioHands o impacto ambiental..."
                        className="flex-1 bg-transparent border-none outline-none text-text-primary text-[15px] py-3 placeholder:text-leaf-100/30"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            isLoading || !input.trim()
                                ? 'bg-leaf-900/30 text-leaf-100/20'
                                : 'bg-leaf-400 text-bg-void hover:scale-105 active:scale-95 shadow-glow'
                        }`}
                    >
                        <Send size={20} />
                    </button>
                </form>
                <p className="text-[9px] text-center mt-4 text-leaf-100/20 uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-1.5">
                    <Sparkles size={10} /> La IA puede cometer errores. Verifica la información importante.
                </p>
            </footer>
        </div>
    );
};

export default Chatbot;
