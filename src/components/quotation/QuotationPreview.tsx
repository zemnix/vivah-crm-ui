import React from 'react';
import { UnifiedQuotationPreview } from '@/services/reactPdfService';
import type { Quotation } from '@/api/quotationApi';

interface QuotationPreviewProps {
    quotation: Quotation;
    onDownloadPDF?: () => Promise<void>;
    showActions?: boolean;
    className?: string;
}

export const QuotationPreview: React.FC<QuotationPreviewProps> = ({
    quotation,
    onDownloadPDF,
    showActions = true,
    className = '',
}) => {
    return (
        <UnifiedQuotationPreview
            quotation={quotation}
            business={undefined}
            onDownloadPDF={onDownloadPDF}
            showActions={showActions}
            className={className}
        />
    );
};

export default QuotationPreview;
