declare module 'jspdf-autotable' {
    import { jsPDF } from 'jspdf';

    interface AutoTableOptions {
        head?: any[];
        body?: any[];
        foot?: any[];
        margin?: any;
        styles?: any;
        startY?: number;
        headStyles?: any;
        bodyStyles?: any;
        footStyles?: any;
        theme?: string;
        tableWidth?: string;
        tableLineWidth?: number;
        tableLineColor?: string;
    }

    interface jsPDFWithAutoTable extends jsPDF {
        autoTable: (options: AutoTableOptions) => jsPDFWithAutoTable;
    }

    function autoTable(options: AutoTableOptions): jsPDFWithAutoTable;
    function autoTable(doc: jsPDF, options: AutoTableOptions): jsPDFWithAutoTable;

    export default autoTable;
} 