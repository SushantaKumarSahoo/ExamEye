'use client';

import { useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onChange, placeholder = 'Enter text...' }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertList = (ordered) => {
    execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        padding: '0.75rem', 
        background: '#f9fafb', 
        borderBottom: '1px solid #e5e7eb',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => execCommand('bold')}
          style={toolbarButtonStyle}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          style={toolbarButtonStyle}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          style={toolbarButtonStyle}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        
        <div style={{ width: '1px', background: '#e5e7eb', margin: '0 0.25rem' }}></div>
        
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<h3>')}
          style={toolbarButtonStyle}
          title="Heading"
        >
          H
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', '<p>')}
          style={toolbarButtonStyle}
          title="Paragraph"
        >
          P
        </button>
        
        <div style={{ width: '1px', background: '#e5e7eb', margin: '0 0.25rem' }}></div>
        
        <button
          type="button"
          onClick={() => insertList(false)}
          style={toolbarButtonStyle}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => insertList(true)}
          style={toolbarButtonStyle}
          title="Numbered List"
        >
          1. List
        </button>
        
        <div style={{ width: '1px', background: '#e5e7eb', margin: '0 0.25rem' }}></div>
        
        <button
          type="button"
          onClick={() => execCommand('justifyLeft')}
          style={toolbarButtonStyle}
          title="Align Left"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyCenter')}
          style={toolbarButtonStyle}
          title="Align Center"
        >
          ↔
        </button>
        <button
          type="button"
          onClick={() => execCommand('justifyRight')}
          style={toolbarButtonStyle}
          title="Align Right"
        >
          ➡
        </button>
        
        <div style={{ width: '1px', background: '#e5e7eb', margin: '0 0.25rem' }}></div>
        
        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          style={toolbarButtonStyle}
          title="Clear Formatting"
        >
          ✕
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        style={{
          minHeight: '300px',
          padding: '1rem',
          outline: 'none',
          background: 'white',
          lineHeight: '1.6',
          fontSize: '0.95rem',
          color: '#1f2937'
        }}
        data-placeholder={placeholder}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
        }
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin: 0.5rem 0;
          padding-left: 2rem;
        }
        [contenteditable] li {
          margin: 0.25rem 0;
        }
        [contenteditable] strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

const toolbarButtonStyle = {
  padding: '0.5rem 0.75rem',
  background: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  color: '#374151',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '36px'
};
