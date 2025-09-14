import { CheckCircle2, AlertTriangle } from 'lucide-react';

async function getDiagnostics() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/diagnostics`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function DiagnosticsPage() {
  const data = await getDiagnostics();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold gradient-text">Diagnostics</h1>
        {!data ? (
          <div className="card-gradient p-4">Failed to load diagnostics.</div>
        ) : (
          <div className="space-y-4">
            <div className="card-gradient p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Vapi Transcription</h2>
                <p className="text-sm text-gray-600">Requires VAPI_PRIVATE_API_KEY and VAPI_TRANSCRIBE_URL</p>
              </div>
              {data.vapiConfigured ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-6 w-6" />
                  <span className="text-sm">Missing configuration</span>
                </div>
              )}
            </div>

            <div className="card-gradient p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Auth0 Login</h2>
                <p className="text-sm text-gray-600">Set NEXT_PUBLIC_AUTH0_ENABLED=true and Auth0 secrets</p>
              </div>
              {data.auth0Enabled && data.auth0Configured ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <div className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-6 w-6" />
                  <span className="text-sm">{data.auth0Enabled ? 'Missing secrets' : 'Disabled'}</span>
                </div>
              )}
            </div>

            <div className="card-gradient p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Google Calendar</h2>
                <p className="text-sm text-gray-600">Set Client ID, Secret, and Redirect URI</p>
              </div>
              {data.googleConfigured ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-6 w-6" />
                  <span className="text-sm">Missing configuration</span>
                </div>
              )}
            </div>

            <div className="card-gradient p-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold">AI Parser Provider</h2>
                <p className="text-sm text-gray-600">Current: {data.parserProvider}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

