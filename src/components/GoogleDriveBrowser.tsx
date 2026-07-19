import React, { useState, useEffect, useRef } from 'react';
import { googleSignIn, logout, getAccessToken } from '../lib/auth';
import { User } from 'firebase/auth';
import { HardDrive, Cloud, FileText, Trash2, ArrowUpRight, LogOut, CheckCircle2, Upload, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface GoogleDriveBrowserProps {
  onConnectionChange: (connected: boolean, token: string | null) => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export default function GoogleDriveBrowser({
  onConnectionChange,
  user,
  onUserChange
}: GoogleDriveBrowserProps) {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and cache state on mount
  useEffect(() => {
    const checkToken = async () => {
      const token = await getAccessToken();
      if (token && user) {
        setAccessTokenState(token);
        onConnectionChange(true, token);
        fetchDriveFiles(token);
      }
    };
    checkToken();
  }, [user]);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChange(result.user);
        setAccessTokenState(result.accessToken);
        onConnectionChange(true, result.accessToken);
        fetchDriveFiles(result.accessToken);
      }
    } catch (err) {
      console.error('OAuth Sign-in failed:', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    onUserChange(null);
    setAccessTokenState(null);
    onConnectionChange(false, null);
    setDriveFiles([]);
  };

  const fetchDriveFiles = async (token: string) => {
    setIsLoadingFiles(true);
    try {
      // Query specific PharmaSmart files, sorted by creation date
      const q = encodeURIComponent("name contains 'PharmaSmart' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=15&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime%20desc`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve files from Google Drive');
      }

      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err) {
      console.error('Error fetching files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const uploadFileToDrive = async (fileName: string, content: string, mimeType: string = 'text/plain') => {
    const token = accessToken || await getAccessToken();
    if (!token) {
      setUploadStatus({ status: 'error', message: 'Veuillez d\'abord vous connecter à Google Drive.' });
      return;
    }

    try {
      setUploadStatus({ status: 'idle', message: 'Téléversement en cours...' });

      const boundary = '365315263232';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: mimeType,
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        close_delim;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      });

      if (!res.ok) {
        throw new Error('Failed uploading to Google Drive');
      }

      setUploadStatus({ status: 'success', message: `Fichier "${fileName}" téléversé avec succès !` });
      fetchDriveFiles(token); // reload list
    } catch (err: any) {
      console.error(err);
      setUploadStatus({ status: 'error', message: `Échec du téléversement: ${err.message}` });
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadStatus({ status: 'idle', message: '' });
    
    const file = e.dataTransfer.files[0];
    if (file) {
      readAndUploadLocalFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndUploadLocalFile(file);
    }
  };

  const readAndUploadLocalFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const prefixedName = file.name.startsWith('PharmaSmart') ? file.name : `PharmaSmart-Import-${file.name}`;
      await uploadFileToDrive(prefixedName, content, file.type || 'text/plain');
    };
    reader.readAsText(file);
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    const confirmed = window.confirm(`Voulez-vous supprimer définitivement "${fileName}" de votre Google Drive ?`);
    if (!confirmed) return;

    const token = accessToken || await getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Could not delete file');
      }

      setDriveFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Erreur lors de la suppression du fichier.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-sans font-semibold text-brand-text-dark">Archivage Google Drive</h2>
        <p className="text-brand-text-muted font-mono text-xs mt-1">
          Stockage sécurisé et conforme dans votre espace Cloud personnel Google Workspace
        </p>
      </div>

      {/* Connection State Panel */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="p-4 bg-brand-primary-light rounded-full text-brand-primary border border-brand-primary/20 shadow-sm">
              <HardDrive size={36} />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-sans font-medium text-brand-text-dark">Connecter Google Drive</h3>
              <p className="text-xs text-brand-text-muted mt-1 leading-normal font-sans">
                L'application nécessite votre autorisation pour lire et écrire de manière autonome vos rapports d'inventaires, plannings et historiques de température.
              </p>
            </div>

            {/* Standard "Sign in with Google" Button layout */}
            <button 
              onClick={handleLogin}
              className="gsi-material-button inline-flex items-center justify-center bg-white hover:bg-neutral-100 text-neutral-800 font-sans font-medium text-sm px-4 py-2.5 rounded-lg border border-neutral-300 shadow-sm cursor-pointer transition-colors"
            >
              <div className="gsi-material-button-content-wrapper flex items-center gap-2.5">
                <div className="gsi-material-button-icon h-4 w-4">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-sans">Sign in with Google</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="h-12 w-12 rounded-full border border-brand-border shadow-sm" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-brand-primary-light border border-brand-primary/20 flex items-center justify-center text-brand-primary uppercase font-bold">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              <div>
                <div className="font-sans font-semibold text-brand-text-dark">{user.displayName || 'Compte Pharmacien'}</div>
                <div className="text-xs font-mono text-brand-text-muted">{user.email}</div>
                <div className="text-[10px] text-brand-text-muted font-mono mt-0.5 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={10} className="text-brand-primary" />
                  ID Cloud : {user.uid.slice(0, 12)}...
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3.5 py-2 font-sans font-semibold text-xs bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 rounded-lg flex items-center gap-2 transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              <LogOut size={13} />
              Déconnecter Google Workspace
            </button>
          </div>
        )}
      </div>

      {/* Main Drive Workspace when authenticated */}
      {user && accessToken && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Browser list */}
          <div className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-sans font-medium text-brand-text-dark flex items-center gap-2">
              <Cloud className="text-brand-primary" size={18} />
              Rapports PharmaSmart récents
            </h3>

            {isLoadingFiles ? (
              <div className="py-12 text-center text-brand-text-muted font-mono text-xs">
                Récupération des fichiers de votre Drive...
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="py-12 text-center text-brand-text-muted font-mono text-xs border border-dashed border-brand-border rounded-lg bg-white">
                Aucun rapport PharmaSmart trouvé dans votre Google Drive.<br />
                <span className="text-[11px] text-brand-text-muted font-sans mt-1 block">Générez des bons de commande, plannings ou historiques IoT pour les voir apparaître ici.</span>
              </div>
            ) : (
              <div className="divide-y divide-brand-border overflow-hidden">
                {driveFiles.map(file => (
                  <div key={file.id} className="py-3 flex justify-between items-center gap-4 text-brand-text-dark hover:bg-brand-primary-light/20 px-2 rounded-lg transition-colors">
                    <div className="flex gap-2.5 items-center min-w-0">
                      <FileText className="text-brand-primary shrink-0" size={16} />
                      <div className="min-w-0">
                        <div className="font-sans font-medium text-sm truncate text-brand-text-dark">{file.name}</div>
                        <div className="text-[10px] font-mono text-brand-text-muted mt-0.5 font-medium">
                          Date de création : {new Date(file.createdTime).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="p-1.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded shadow-sm border border-brand-primary"
                        title="Ouvrir dans Google Drive"
                      >
                        <ArrowUpRight size={14} />
                      </a>
                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Import / Manual File Uploader Panel */}
          <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-lg font-sans font-medium text-brand-text-dark">Téléverser sur Drive</h3>
              <p className="text-xs text-brand-text-muted font-sans leading-relaxed">
                Importez manuellement une liste d'inventaire locale, un fichier de consignes ou un planning. Le fichier sera indexé et stocké sous préfixe <strong className="text-brand-primary">"PharmaSmart-"</strong>.
              </p>

              {/* Drag and drop stage */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-brand-primary bg-brand-primary-light/50 text-brand-primary'
                    : 'border-brand-border bg-white hover:bg-brand-primary-light/30 text-brand-text-muted'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="mx-auto h-8 w-8 mb-3 text-brand-primary" />
                <span className="block text-xs font-sans font-medium text-brand-text-dark">Glissez-déposez un fichier ici</span>
                <span className="block text-[10px] font-mono text-brand-text-muted mt-1">ou cliquez pour parcourir</span>
              </div>
            </div>

            {/* Upload status view */}
            {uploadStatus.status !== 'idle' && (
              <div className={`p-3 rounded-lg flex gap-2 text-xs font-mono items-start ${
                uploadStatus.status === 'success'
                  ? 'bg-brand-primary-light border border-brand-primary/20 text-brand-primary font-medium'
                  : 'bg-red-50 border border-red-200 text-red-600 font-medium'
              }`}>
                {uploadStatus.status === 'success' ? (
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                )}
                <span>{uploadStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
