import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
  preview?: boolean;
}

export function FileUpload({
  onFileSelect,
  accept = 'image/jpeg,image/png',
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  disabled = false,
  preview = true,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Only JPG and PNG files are allowed');
      } else {
        setError('Invalid file');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);

      if (preview && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  }, [maxSize, onFileSelect, preview]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, type) => ({ ...acc, [type.trim()]: [] }), {}),
    maxSize,
    multiple: false,
    disabled,
  });

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-destructive",
          className
        )}
        data-testid="file-upload-dropzone"
      >
        <input {...getInputProps()} data-testid="file-upload-input" />
        
        {selectedFile ? (
          <div className="flex flex-col items-center space-y-2">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-32 h-32 object-cover rounded-md border"
              />
            ) : (
              <File className="h-12 w-12 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round(selectedFile.size / 1024)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              data-testid="remove-file-button"
            >
              <X className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? "Drop the file here" : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                {accept.includes('image') ? 'JPG or PNG' : 'Supported files'}, max {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="file-upload-error">
          {error}
        </p>
      )}
    </div>
  );
}
