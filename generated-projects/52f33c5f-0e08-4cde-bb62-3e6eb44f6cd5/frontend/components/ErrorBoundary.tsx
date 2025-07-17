import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      hasError: true,
      errorInfo: errorInfo.componentStack
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  renderError() {
    return (
      <div role="alert" aria-live="assertive" className="error-boundary">
        <h2>Something went wrong.</h2>
        {this.state.errorInfo && (
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo}
          </details>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderError();
    }
    return this.props.children;
  }
}

export default ErrorBoundary;