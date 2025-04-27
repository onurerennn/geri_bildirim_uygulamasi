import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    CircularProgress,
    Alert,
    TextField,
    IconButton,
    Divider,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Snackbar
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Download as DownloadIcon,
    Share as ShareIcon,
    Print as PrintIcon,
    Delete as DeleteIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { styled } from '@mui/material/styles';
import { useSnackbar } from '../contexts/SnackbarContext';
import surveyService from '../services/surveyService';

interface QRCode {
    _id: string;
    code: string;
    surveyId: string;
    businessId: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    surveyTitle?: string;
}

interface SurveyType {
    _id: string;
    title: string;
    description: string;
    qrCodes: QRCode[];
}

const StyledPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    textAlign: 'center',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
}));

const QRCodeWrapper = styled('div')({
    margin: '20px 0',
    display: 'flex',
    justifyContent: 'center',
});

const SurveyQRCodes: React.FC = () => {
    const { surveyId } = useParams<{ surveyId: string }>();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [snackbarState, setSnackbarState] = useState<{ open: boolean, message: string, severity: 'success' | 'info' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
    const [survey, setSurvey] = useState<SurveyType | null>(null);
    const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleCloseSnackbar = () => {
        setSnackbarState({ ...snackbarState, open: false });
    };

    useEffect(() => {
        const fetchQRCodes = async () => {
            try {
                setLoading(true);
                setError(null);

                // Anket detaylarını getir
                const surveyResponse = await api.get(`/api/surveys/${surveyId}`);
                setSurvey(surveyResponse.data);

                // QR kodlarını getir
                const qrResponse = await api.get(`/api/surveys/qr/survey/${surveyId}`);
                setQrCodes(qrResponse.data);

                setLoading(false);
            } catch (err: any) {
                console.error('QR kodları yüklenirken hata oluştu:', err);
                setError('QR kodları yüklenirken bir hata oluştu');
                setLoading(false);
            }
        };

        if (surveyId) {
            fetchQRCodes();
        }
    }, [surveyId]);

    const svgToDataURL = (svgElement: SVGSVGElement): string => {
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const encoded = encodeURIComponent(svgString);
        return `data:image/svg+xml;charset=utf-8,${encoded}`;
    };

    const downloadQRCode = (qrCode: QRCode, index: number) => {
        const element = document.getElementById(`qr-code-${qrCode._id}`);
        const svgElement = element instanceof SVGSVGElement ? element : null;
        if (svgElement) {
            const svgDataUrl = svgToDataURL(svgElement);

            const downloadLink = document.createElement('a');
            downloadLink.href = svgDataUrl;
            downloadLink.download = `${survey?.title || 'anket'}-qr-kod-${index + 1}.svg`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            showSnackbar('QR kod indirildi', 'success');
        }
    };

    const printQRCodes = () => {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showSnackbar('Pop-up penceresi açılamadı. Lütfen pop-up engelleyiciyi kontrol edin.', 'error');
            return;
        }

        // Generate QR code image URLs
        const qrCodeImages = qrCodes.map((qr, i) => {
            const element = document.getElementById(`qr-code-${qr._id}`);
            const svgElement = element instanceof SVGSVGElement ? element : null;
            return svgElement ? svgToDataURL(svgElement) : '';
        });

        // Generate HTML for print
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${survey?.title || 'Anket'} QR Kodları</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
                    .title { text-align: center; margin-bottom: 20px; }
                    .qr-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                    .qr-item { border: 1px solid #ddd; padding: 15px; text-align: center; page-break-inside: avoid; }
                    .qr-code { margin-bottom: 10px; }
                    .qr-info { font-size: 14px; margin-top: 10px; }
                    @media print {
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="title">
                        <h1>${survey?.title || 'Anket'} QR Kodları</h1>
                        <p>${survey?.description || ''}</p>
                    </div>
                    <div class="qr-grid">
                        ${qrCodes.map((qr, i) => `
                            <div class="qr-item">
                                <div class="qr-code">
                                    <img src="${qrCodeImages[i]}" width="200" height="200" />
                                </div>
                                <div class="qr-info">
                                    <p><strong>QR Kod ${i + 1}</strong></p>
                                    <p>Kod: ${qr.code}</p>
                                    <p>URL: ${qr.url}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <p class="no-print" style="text-align: center; margin-top: 30px;">
                        <button onclick="window.print()">Yazdır</button>
                    </p>
                </div>
                <script>
                    window.onload = function() {
                        // Otomatik yazdırma diyalogunu aç
                        setTimeout(() => window.print(), 500);
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showSnackbar('URL copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            showSnackbar('Failed to copy URL', 'error');
        }
    };

    const handleShareQRCode = async (qrCode: QRCode) => {
        try {
            if ('share' in navigator) {
                await (navigator as any).share({
                    title: `QR Code for ${qrCode.surveyTitle || 'Survey'}`,
                    text: 'Scan this QR code to access the survey',
                    url: qrCode.url
                });
                showSnackbar('QR code shared successfully', 'success');
            } else {
                await copyToClipboard(qrCode.url);
            }
        } catch (error) {
            console.error('Error sharing QR code:', error);
            showSnackbar('Failed to share QR code', 'error');
        }
    };

    const openDeleteDialog = (id: string) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            setLoading(true);
            await api.delete(`/api/surveys/qr/${deleteId}`);

            // Silinen QR kodu listeden çıkar
            setQrCodes(qrCodes.filter(qr => qr._id !== deleteId));
            setConfirmOpen(false);
            setDeleteId(null);
            setLoading(false);
            showSnackbar('QR kod başarıyla silindi', 'success');
        } catch (err: any) {
            console.error('QR kod silinirken hata oluştu:', err);
            setError('QR kod silinirken bir hata oluştu');
            setConfirmOpen(false);
            setLoading(false);
            showSnackbar('QR kod silinirken bir hata oluştu', 'error');
        }
    };

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>QR Kodlar yükleniyor...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/business/surveys')}
                >
                    Anketlere Dön
                </Button>
            </Container>
        );
    }

    if (!survey) {
        return (
            <Container maxWidth="md" sx={{ mt: 4 }}>
                <Alert severity="warning">Survey not found</Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/business/surveys')}
                >
                    Anketlere Dön
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ my: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <IconButton onClick={() => navigate('/business/surveys')} sx={{ mr: 2 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1">
                    QR Kodlar: {survey?.title}
                </Typography>
            </Box>

            {qrCodes.length === 0 ? (
                <Alert severity="info">
                    Bu anket için QR kodu bulunamadı. Yeni bir QR kodu oluşturun.
                </Alert>
            ) : (
                <>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Anketiniz için oluşturulan QR kodları aşağıda görebilirsiniz. İndirmek, paylaşmak
                            veya yazdırmak için butonları kullanabilirsiniz.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Her QR kodu benzersizdir ve anketi farklı yerlerden taratılmasını takip etmek için kullanılabilir.
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {qrCodes.map((qrCode, index) => (
                            <Grid item xs={12} sm={6} md={6} key={qrCode._id}>
                                <StyledPaper elevation={3}>
                                    <Typography variant="h6" gutterBottom>
                                        QR Kod: {qrCode.code}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        {qrCode.surveyTitle || survey?.title || 'Anket'}
                                    </Typography>
                                    <QRCodeWrapper>
                                        <QRCodeSVG
                                            id={`qr-code-${qrCode._id}`}
                                            value={qrCode.url}
                                            size={200}
                                            level="H"
                                        />
                                    </QRCodeWrapper>
                                    <TextField
                                        value={qrCode.url}
                                        variant="outlined"
                                        size="small"
                                        fullWidth
                                        margin="normal"
                                        InputProps={{
                                            readOnly: true,
                                        }}
                                    />
                                    <Grid container spacing={1} justifyContent="center">
                                        <Grid item>
                                            <IconButton
                                                color="primary"
                                                onClick={() => downloadQRCode(qrCode, index)}
                                                title="İndir"
                                            >
                                                <DownloadIcon />
                                            </IconButton>
                                        </Grid>
                                        <Grid item>
                                            <IconButton
                                                color="primary"
                                                onClick={printQRCodes}
                                                title="Yazdır"
                                            >
                                                <PrintIcon />
                                            </IconButton>
                                        </Grid>
                                        <Grid item>
                                            <IconButton
                                                color="primary"
                                                onClick={() => handleShareQRCode(qrCode)}
                                                title="Paylaş"
                                            >
                                                {'share' in navigator ? <ShareIcon /> : <ContentCopyIcon />}
                                            </IconButton>
                                        </Grid>
                                        <Grid item>
                                            <IconButton
                                                color="error"
                                                onClick={() => openDeleteDialog(qrCode._id)}
                                                title="Sil"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                </StyledPaper>
                            </Grid>
                        ))}
                    </Grid>
                </>
            )}

            <Dialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
            >
                <DialogTitle>QR Kodu Sil</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bu QR kodu silmek istediğinizden emin misiniz?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>İptal</Button>
                    <Button onClick={handleDelete} color="error" autoFocus>
                        Sil
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SurveyQRCodes; 