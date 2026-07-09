import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { ParsedDataset, KPI, Insight, ChatMessage, AppPage } from '../types';

interface AppState {
    currentPage: AppPage;
    dataset: ParsedDataset | null;
    kpis: KPI[];
    insights: Insight[];
    chatMessages: ChatMessage[];
    isLoading: boolean;
    loadingMessage: string;
}

type Action =
    | { type: 'SET_PAGE'; page: AppPage }
    | { type: 'SET_DATASET'; dataset: ParsedDataset }
    | { type: 'SET_KPIS'; kpis: KPI[] }
    | { type: 'TOGGLE_KPI'; id: string }
    | { type: 'SET_INSIGHTS'; insights: Insight[] }
    | { type: 'TOGGLE_BOOKMARK'; id: string }
    | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
    | { type: 'SET_LOADING'; isLoading: boolean; message?: string }
    | { type: 'RESET' };

const initialState: AppState = {
    currentPage: 'upload',
    dataset: null,
    kpis: [],
    insights: [],
    chatMessages: [],
    isLoading: false,
    loadingMessage: '',
};

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_PAGE':
            return { ...state, currentPage: action.page };
        case 'SET_DATASET':
            return { ...state, dataset: action.dataset, currentPage: 'dashboard' };
        case 'SET_KPIS':
            return { ...state, kpis: action.kpis };
        case 'TOGGLE_KPI':
            return {
                ...state,
                kpis: state.kpis.map(k =>
                    k.id === action.id ? { ...k, accepted: !k.accepted } : k
                ),
            };
        case 'SET_INSIGHTS':
            return { ...state, insights: action.insights };
        case 'TOGGLE_BOOKMARK':
            return {
                ...state,
                insights: state.insights.map(i =>
                    i.id === action.id ? { ...i, bookmarked: !i.bookmarked } : i
                ),
            };
        case 'ADD_CHAT_MESSAGE':
            return { ...state, chatMessages: [...state.chatMessages, action.message] };
        case 'SET_LOADING':
            return { ...state, isLoading: action.isLoading, loadingMessage: action.message || '' };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

const StoreContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
} | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
        <StoreContext.Provider value={{ state, dispatch }}>
            {children}
        </StoreContext.Provider>
    );
}

export function useStore() {
    const context = useContext(StoreContext);
    if (!context) throw new Error('useStore must be used within StoreProvider');
    return context;
}
