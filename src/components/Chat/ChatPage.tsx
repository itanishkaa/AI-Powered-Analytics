import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useStore } from '../../store/useStore';
import { executeQuery, getSuggestions } from '../../engine/queryEngine';
import type { ChatMessage } from '../../types';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#3b82f6', '#22c55e', '#eab308', '#ef4444'];

let msgId = 0;

export function ChatPage() {
    const { state, dispatch } = useStore();
    const { chatMessages, dataset } = state;
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions = dataset ? getSuggestions(dataset) : [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = (query?: string) => {
        const q = query || input.trim();
        if (!q || !dataset) return;

        const userMsg: ChatMessage = {
            id: `msg-${++msgId}`,
            role: 'user',
            content: q,
            timestamp: new Date(),
        };
        dispatch({ type: 'ADD_CHAT_MESSAGE', message: userMsg });
        setInput('');
        setIsTyping(true);

        setTimeout(() => {
            const result = executeQuery(q, dataset);
            const assistantMsg: ChatMessage = {
                id: `msg-${++msgId}`,
                role: 'assistant',
                content: result.answer,
                timestamp: new Date(),
                tableData: result.data,
                chartData: result.chartData ? result.chartData : undefined,
                chartType: result.chartType,
            };
            dispatch({ type: 'ADD_CHAT_MESSAGE', message: assistantMsg });
            setIsTyping(false);
        }, 600);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!dataset) {
        return (
            <div className="empty-state">
                <Bot size={48} />
                <p>Upload a dataset to start asking questions.</p>
            </div>
        );
    }

    return (
        <div className="chat-page">
            {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--accent-glow)', borderRadius: 'var(--radius-lg)', marginBottom: '1rem' }}>
                        <Sparkles size={32} color="var(--accent-primary)" />
                    </div>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>Ask anything about your data</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Try natural language queries like "What is the total revenue?" or "Top 5 regions by sales"
                    </p>
                    <div className="query-suggestions" style={{ justifyContent: 'center' }}>
                        {suggestions.map((s, i) => (
                            <button key={i} className="suggestion-chip" onClick={() => handleSend(s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="chat-messages">
                {chatMessages.map(msg => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        <div className={`chat-avatar ${msg.role}`}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className="chat-bubble">
                            <div dangerouslySetInnerHTML={{
                                __html: msg.content
                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                    .replace(/\n/g, '<br/>')
                            }} />

                            {msg.tableData && msg.tableData.length > 0 && (
                                <table className="chat-table">
                                    <thead>
                                        <tr>
                                            {Object.keys(msg.tableData[0]).map(key => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {msg.tableData.map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((val, j) => (
                                                    <td key={j}>{String(val)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {msg.chartData && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={msg.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                            <YAxis tick={{ fontSize: 10 }} />
                                            <Tooltip />
                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                {msg.chartData!.map((_entry, i) => (
                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="chat-message assistant">
                        <div className="chat-avatar assistant"><Bot size={16} /></div>
                        <div className="chat-bubble" style={{ display: 'flex', gap: 6 }}>
                            <span style={{ animation: 'pulse 1s infinite', animationDelay: '0ms' }}>●</span>
                            <span style={{ animation: 'pulse 1s infinite', animationDelay: '200ms' }}>●</span>
                            <span style={{ animation: 'pulse 1s infinite', animationDelay: '400ms' }}>●</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {chatMessages.length > 0 && suggestions.length > 0 && (
                <div className="query-suggestions">
                    {suggestions.slice(0, 4).map((s, i) => (
                        <button key={i} className="suggestion-chip" onClick={() => handleSend(s)}>
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <div className="chat-input-area">
                <input
                    ref={inputRef}
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your data..."
                    disabled={isTyping}
                />
                <button className="btn btn-primary" onClick={() => handleSend()} disabled={!input.trim() || isTyping}>
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
