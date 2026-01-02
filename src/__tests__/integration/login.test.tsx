import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Login from '../../pages/Login';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock useNavigate
const mockedUsedNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockedUsedNavigate,
    };
});

// Mock config
vi.mock('@/lib/config', () => ({
    API_CONFIG: {
        baseURL: 'http://localhost:3000',
    },
}));

describe('Login Integration', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        localStorage.clear();
        mockedUsedNavigate.mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders login form correctly', () => {
        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                token: 'fake-jwt-token',
                user: { id: 1, username: 'testuser', role: 'admin' },
                sessionId: 'sess-123'
            })
        });

        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });

        const loginButton = screen.getByRole('button', { name: /login/i });
        fireEvent.click(loginButton);

        expect(loginButton).toBeDisabled();
        expect(screen.getByText(/logging in/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(localStorage.getItem('auth_token')).toBe('fake-jwt-token');
            expect(localStorage.getItem('user')).toContain('testuser');
            expect(mockedUsedNavigate).toHaveBeenCalledWith('/summary-dashboard');
        });
    });

    it('handles login failure', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            json: async () => ({
                error: 'Invalid credentials'
            })
        });

        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'wronguser' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });

        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
            expect(mockedUsedNavigate).not.toHaveBeenCalled();
        });
    });

    it('handles network error', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network Error'));

        render(
            <BrowserRouter>
                <Login />
            </BrowserRouter>
        );

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'test' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });

        fireEvent.click(screen.getByRole('button', { name: /login/i }));

        await waitFor(() => {
            expect(screen.getByText(/terjadi kesalahan koneksi/i)).toBeInTheDocument();
        });
    });
});
