import React, { useState, useEffect } from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Stack,
    Box,
    CircularProgress,
    Alert,
    TextField,
    Button,
    CardActions,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Download as DownloadIcon, Share as ShareIcon, Print as PrintIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface QRCodeData {
    _id: string;
    code: string;
    url: string;
    surveyId: string;
    businessId: string;
    isActive: boolean;
    createdAt: string;
    surveyTitle?: string;
    survey?: {
        title: string;
        _id: string;
    };
}

const QRCodes: React.FC = () => {
    const { user } = useAuth();
    const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        const fetchQRCodes = async () => {
            try {
                setLoading(true);
                if (!user?.business) {
                    setError('İşletme bilgisi bulunamadı');
                    setLoading(false);
                    return;
                }

                const response = await api.get(`/surveys/qr/business/${user.business}`);
                console.log('Business QR codes response:', response.data);

                // Handle different response formats
                let qrCodesData: QRCodeData[] = [];

                // New format: {success: true, data: [...]}
                if (response.data && typeof response.data === 'object' && response.data.hasOwnProperty('success')) {
                    if (response.data.success && Array.isArray(response.data.data)) {
                        // Process data array based on format
                        const data = response.data.data;

                        // Format 1: Array of survey objects with qrCodes arrays
                        if (data.length > 0 && data[0].survey && Array.isArray(data[0].qrCodes)) {
                            data.forEach(item => {
                                if (item.qrCodes && Array.isArray(item.qrCodes)) {
                                    const surveyTitle = item.survey?.title || 'Adsız Anket';
                                    const qrCodesWithTitle = item.qrCodes.map(qr => ({
                                        ...qr,
                                        surveyTitle,
                                        survey: item.survey
                                    }));
                                    qrCodesData.push(...qrCodesWithTitle);
                                }
                            });
                        }
                        // Format 2: Direct array of QR code objects
                        else {
                            qrCodesData = data;
                        }
                    }
                }
                // Legacy format: array of { survey: {...}, qrCodes: [...] }
                else if (Array.isArray(response.data)) {
                    response.data.forEach(item => {
                        if (item.qrCodes && Array.isArray(item.qrCodes)) {
                            const surveyTitle = item.survey?.title || 'Adsız Anket';
                            const qrCodesWithTitle = item.qrCodes.map(qr => ({
                                ...qr,
                                surveyTitle,
                                survey: item.survey
                            }));
                            qrCodesData.push(...qrCodesWithTitle);
                        }
                    });
                }

                console.log(`Processed ${qrCodesData.length} QR codes from all surveys`);
                setQrCodes(qrCodesData);
                setLoading(false);
            } catch (err: any) {
                console.error('QR kodları yüklenirken hata oluştu:', err);
                setError('QR kodları yüklenirken bir hata oluştu');
                setLoading(false);
            }
        };

        fetchQRCodes();
    }, [user]);

    const downloadQRCode = (qrCode: QRCodeData) => {
        // SVG elementini seç
        const svg = document.getElementById(`qr-code-${qrCode._id}`);
        if (!svg || !(svg instanceof SVGElement)) {
            console.error('QR kod SVG elementi bulunamadı');
            return;
        }

        // SVG'yi bir data URI'ye dönüştür
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Canvas boyutunu ayarla (daha yüksek çözünürlük için)
        canvas.width = 1000;
        canvas.height = 1000;

        img.onload = () => {
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // QR kodu dosyasını indir
            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `qr-code-${qrCode.code}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    const printQRCode = (qrCode: QRCodeData) => {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (!printWindow) return;

        const surveyName = qrCode.surveyTitle || qrCode.survey?.title || 'Anket';

        // Get the SVG element and safely cast it
        const svgElement = document.getElementById(`qr-code-${qrCode._id}`);
        if (!svgElement || !(svgElement instanceof SVGElement)) {
            console.error('QR code SVG element not found or is not an SVG element');
            return;
        }

        // Now we have a properly typed SVG element
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgBase64 = btoa(svgData);

        printWindow.document.write(`
            <html>
                <head>
                    <title>QR Kod: ${surveyName}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 20px;
                        }
                        .qr-container {
                            margin: 20px auto;
                            padding: 20px;
                            max-width: 400px;
                            border: 1px solid #ccc;
                            border-radius: 8px;
                        }
                        .qr-code {
                            width: 300px;
                            height: 300px;
                            margin: 0 auto;
                        }
                        .info {
                            margin-top: 20px;
                        }
                        .url {
                            word-break: break-all;
                            font-size: 12px;
                            color: #555;
                            margin-top: 10px;
                        }
                        .code {
                            font-size: 14px;
                            font-weight: bold;
                            color: #222;
                            margin-top: 10px;
                            padding: 5px;
                            background: #f0f0f0;
                            border-radius: 4px;
                            display: inline-block;
                        }
                    </style>
                </head>
                <body>
                    <div class="qr-container">
                        <h2>${surveyName}</h2>
                        <div class="qr-code">
                            <img src="data:image/svg+xml;base64,${svgBase64}" width="100%" />
                        </div>
                        <div class="info">
                            <p>Lütfen ankete katılmak için QR kodu tarayın</p>
                            <p>Veya kodu manuel girin:</p>
                            <p class="code">${qrCode.code}</p>
                            <p class="url">${qrCode.url}</p>
                        </div>
                    </div>
                    <script>
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    </script>
                </body>
            </html>
        `);

        printWindow.document.close();
    };

    const shareQRCode = (qrCode: QRCodeData) => {
        const surveyTitle = qrCode.surveyTitle || qrCode.survey?.title || 'Anket';
        if (navigator.share) {
            navigator.share({
                title: `${surveyTitle} - QR Kodu`,
                text: `${surveyTitle} anketine katılmak için QR kodu tarayın veya kodu girin: ${qrCode.code}`,
                url: qrCode.url
            }).catch(err => {
                console.error('Paylaşım hatası:', err);
                // Alternatif olarak kopyalama işlemi yap
                copyToClipboard(qrCode);
            });
        } else {
            // Web Share API desteklenmiyorsa kopyala
            copyToClipboard(qrCode);
        }
    };

    const copyToClipboard = (qrCode: QRCodeData) => {
        navigator.clipboard.writeText(`Anket Kodu: ${qrCode.code}\nURL: ${qrCode.url}`)
            .then(() => {
                alert('QR kod bilgileri panoya kopyalandı!');
            })
            .catch(err => {
                console.error('Kopyalama hatası:', err);
                alert('Kopyalama işlemi başarısız oldu');
            });
    };

    // QR kodu silme fonksiyonu
    const openDeleteDialog = (id: string) => {
        setDeleteId(id);
        setConfirmOpen(true);
    };

    // Ensure qrCodes is always an array
    const ensureQrCodesArray = (): QRCodeData[] => {
        if (!qrCodes) return [];
        if (!Array.isArray(qrCodes)) return [qrCodes as any];
        return qrCodes;
    };

    const handleDelete = async () => {
        if (!deleteId) return;

        try {
            setLoading(true);
            await api.delete(`/surveys/qr/${deleteId}`);

            // Silinen QR kodu listeden çıkar
            setQrCodes(ensureQrCodesArray().filter(qr => qr._id !== deleteId));
            setConfirmOpen(false);
            setDeleteId(null);
            setLoading(false);
        } catch (err: any) {
            console.error('QR kod silinirken hata oluştu:', err);
            setError('QR kod silinirken bir hata oluştu');
            setConfirmOpen(false);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ mt: 2 }}>
                    QR Kodlar yükleniyor...
                </Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Stack spacing={3}>
                <Typography variant="h4" component="h1" gutterBottom>
                    QR Kodlar
                </Typography>
                {ensureQrCodesArray().length === 0 ? (
                    <Alert severity="info">
                        Henüz hiç QR kodunuz bulunmamaktadır. Anket oluşturduğunuzda otomatik olarak QR kodları oluşturulacaktır.
                    </Alert>
                ) : (
                    <Stack direction="row" flexWrap="wrap" gap={2}>
                        {ensureQrCodesArray().map((qr) => (
                            <Box key={qr._id} sx={{ width: { xs: '100%', sm: '45%', md: '30%' } }}>
                                <Card elevation={3}>
                                    <CardContent>
                                        <Typography variant="h6" component="h2" gutterBottom>
                                            {qr.surveyTitle || qr.survey?.title || 'Anket'}
                                        </Typography>
                                        <Box sx={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            mb: 2,
                                            p: 2,
                                            bgcolor: 'white',
                                            borderRadius: 2,
                                            border: '1px solid #eee'
                                        }}>
                                            <QRCodeSVG id={`qr-code-${qr._id}`} value={qr.url} size={200} level="H" />
                                        </Box>
                                        <TextField
                                            label="QR Kod ID"
                                            value={qr.code}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            margin="normal"
                                            InputProps={{
                                                readOnly: true,
                                            }}
                                            helperText="Bu kodu manuel olarak girmek için kullanabilirsiniz"
                                        />
                                        <TextField
                                            label="URL"
                                            value={qr.url}
                                            variant="outlined"
                                            size="small"
                                            fullWidth
                                            margin="normal"
                                            InputProps={{
                                                readOnly: true,
                                            }}
                                        />
                                    </CardContent>
                                    <Divider />
                                    <CardActions sx={{ justifyContent: 'center', p: 2 }}>
                                        <Button
                                            startIcon={<DownloadIcon />}
                                            variant="contained"
                                            onClick={() => downloadQRCode(qr)}
                                        >
                                            İndir
                                        </Button>
                                        <Button
                                            startIcon={<PrintIcon />}
                                            onClick={() => printQRCode(qr)}
                                        >
                                            Yazdır
                                        </Button>
                                        <Button
                                            startIcon={<ShareIcon />}
                                            onClick={() => shareQRCode(qr)}
                                        >
                                            Paylaş
                                        </Button>
                                        <Button
                                            startIcon={<DeleteIcon />}
                                            color="error"
                                            onClick={() => openDeleteDialog(qr._id)}
                                        >
                                            Sil
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Stack>

            {/* QR Kod Silme Dialog */}
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

export default QRCodes; 