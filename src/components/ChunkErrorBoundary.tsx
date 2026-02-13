import React, { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    isReloading: boolean;
}

/**
 * Error Boundary to catch chunk loading errors and auto-reload
 * This prevents the "Failed to fetch dynamically imported module" error
 * from persisting after deployments
 */
class ChunkErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, isReloading: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Check if it's a chunk loading error
        const isChunkError =
            error.message.includes("Failed to fetch dynamically imported module") ||
            error.message.includes("Importing a module script failed") ||
            error.message.includes("error loading dynamically imported module");

        if (isChunkError) {
            return { hasError: true, isReloading: false };
        }

        // Re-throw other errors to default error boundary or console
        throw error;
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        const isChunkError =
            error.message.includes("Failed to fetch dynamically imported module") ||
            error.message.includes("Importing a module script failed") ||
            error.message.includes("error loading dynamically imported module");

        if (isChunkError) {
            console.warn("Chunk loading error detected, reloading page...", error);

            // Set reloading state
            this.setState({ isReloading: true });

            // Auto-reload after 1 second to fetch fresh HTML
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            console.error("Unexpected error:", error, errorInfo);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100vh",
                        flexDirection: "column",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        padding: "20px",
                        textAlign: "center",
                    }}
                >
                    <div
                        style={{
                            backgroundColor: "#f3f4f6",
                            borderRadius: "8px",
                            padding: "40px",
                            maxWidth: "500px",
                        }}
                    >
                        <div
                            style={{
                                width: "64px",
                                height: "64px",
                                margin: "0 auto 20px",
                                borderRadius: "50%",
                                backgroundColor: "#3b82f6",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                            >
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                            </svg>
                        </div>
                        <h2
                            style={{
                                fontSize: "20px",
                                fontWeight: "600",
                                marginBottom: "12px",
                                color: "#111827",
                            }}
                        >
                            {this.state.isReloading ? "Reloading Application..." : "Update Detected"}
                        </h2>
                        <p style={{ color: "#6b7280", marginBottom: "20px" }}>
                            {this.state.isReloading
                                ? "Please wait while we load the latest version..."
                                : "A new version is available. Updating now..."}
                        </p>
                        {this.state.isReloading && (
                            <div
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    margin: "0 auto",
                                    border: "4px solid #e5e7eb",
                                    borderTop: "4px solid #3b82f6",
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                        )}
                        <style>
                            {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
                        </style>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ChunkErrorBoundary;
