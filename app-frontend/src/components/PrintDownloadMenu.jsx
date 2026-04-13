import React, { useState, useRef, useEffect } from 'react';
import { Printer, Download, Loader2, ChevronDown } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'react-hot-toast';

export default function PrintDownloadMenu({ documentGenerator, fileName = 'Document.pdf' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [actionLabel, setActionLabel] = useState('');
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleGenerate = async (action) => {
        setIsOpen(false);
        setIsGenerating(true);
        setActionLabel(action === 'print' ? 'Preparing Print...' : 'Generating PDF...');

        try {
            // Fetch dynamic component via generator
            const Component = await documentGenerator();

            // Generate Blob from the passed Document component
            const blob = await pdf(Component).toBlob();
            const blobUrl = URL.createObjectURL(blob);

            if (action === 'download') {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Download Complete');
            } else if (action === 'print') {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = blobUrl;
                document.body.appendChild(iframe);

                iframe.onload = () => {
                    setTimeout(() => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }, 300); // Give the browser reader a moment to interpret the PDF stream
                };
            }
        } catch (error) {
            console.error('PDF Generation failed', error);
            toast.error('Failed to generate PDF. Check console.');
        } finally {
            setIsGenerating(false);
            setActionLabel('');
        }
    };

    if (isGenerating) {
        return (
            <div className="flex items-center text-blue-600 text-xs font-medium space-x-1" title={actionLabel}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">{actionLabel}</span>
            </div>
        );
    }

    return (
        <div className="relative inline-block text-left" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center text-gray-600 hover:text-gray-800 focus:outline-none"
                title="Print/Download"
            >
                <Printer className="w-5 h-5 mr-1" />
                <ChevronDown className="w-3 h-3" />
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div className="py-1">
                        <button
                            onClick={() => handleGenerate('print')}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </button>
                        <button
                            onClick={() => handleGenerate('download')}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
