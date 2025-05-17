import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { surveyService } from '../services/surveyService';
import { useSnackbar } from '../contexts/SnackbarContext';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import DownloadIcon from '@mui/icons-material/Download';
import DateRangeIcon from '@mui/icons-material/DateRange';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SummarizeIcon from '@mui/icons-material/Summarize';

// Chart.js ve jsPDF kütüphanelerini kullanacağız
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions?: any[];
  createdAt: string;
  responseCount?: number;
}

interface SurveyResponse {
  _id: string;
  survey: {
    _id: string;
    title: string;
  };
  createdAt: string;
  customer?: {
    name: string;
    email: string;
  };
  answers: {
    question: string;
    value: string | number;
  }[];
  pointsApproved: boolean | null;
  rewardPoints: number;
}

interface AnalyticsData {
  totalResponses: number;
  pendingResponses: number;
  approvedResponses: number;
  rejectedResponses: number;
  averageRating: number;
  responsesByDate: Record<string, number>;
  responsesBySurvey: Record<string, number>;
  surveyTitles: Record<string, string>;
  ratingDistribution: number[];
}

const BusinessAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState<boolean>(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('last30days');
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (responses.length > 0 && surveys.length > 0) {
      processAnalyticsData();
    }
  }, [responses, surveys, selectedDateRange, selectedSurvey]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // İşletme ID'sini al
      const businessId = user?.business;

      if (!businessId) {
        setError('İşletme bilgisi bulunamadı');
        setLoading(false);
        return;
      }

      // Anket ve yanıtları paralel olarak getir
      const [surveysData, responsesData] = await Promise.all([
        surveyService.getBusinessSurveys(),
        surveyService.getBusinessResponses(businessId)
      ]);

      console.log('Anketler:', surveysData);
      console.log('Yanıtlar:', responsesData);

      setSurveys(surveysData);
      setResponses(responsesData);
    } catch (err: any) {
      console.error('Veri yüklenirken hata:', err);
      setError(`Veri yüklenirken hata: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = () => {
    // Tarih aralığına göre yanıtları filtrele
    const filteredResponses = filterResponsesByDate(responses, selectedDateRange);

    // Anket ID'sine göre filtrele (eğer "all" değilse)
    const surveyFilteredResponses = selectedSurvey === 'all'
      ? filteredResponses
      : filteredResponses.filter(r => r.survey && r.survey._id === selectedSurvey);

    // Anket başlıklarını hazırla
    const surveyTitles: Record<string, string> = {};
    surveys.forEach(survey => {
      surveyTitles[survey._id] = survey.title;
    });

    // Temel istatistikleri hesapla
    const totalResponses = surveyFilteredResponses.length;
    const pendingResponses = surveyFilteredResponses.filter(r => r.pointsApproved === null).length;
    const approvedResponses = surveyFilteredResponses.filter(r => r.pointsApproved === true).length;
    const rejectedResponses = surveyFilteredResponses.filter(r => r.pointsApproved === false).length;

    // Ortalama derecelendirmeyi hesapla (1-5 arası derecelendirme sorularını kullan)
    let ratingSum = 0;
    let ratingCount = 0;
    const ratingDistribution = [0, 0, 0, 0, 0]; // 1-5 arası derecelendirmeler için

    surveyFilteredResponses.forEach(response => {
      response.answers.forEach(answer => {
        const value = parseInt(answer.value as string);
        if (!isNaN(value) && value >= 1 && value <= 5) {
          ratingSum += value;
          ratingCount++;
          ratingDistribution[value - 1]++;
        }
      });
    });

    const averageRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

    // Tarihe göre yanıt sayılarını hesapla
    const responsesByDate: Record<string, number> = {};
    surveyFilteredResponses.forEach(response => {
      const date = new Date(response.createdAt).toLocaleDateString('tr-TR');
      responsesByDate[date] = (responsesByDate[date] || 0) + 1;
    });

    // Anketlere göre yanıt sayılarını hesapla
    const responsesBySurvey: Record<string, number> = {};
    surveyFilteredResponses.forEach(response => {
      if (response.survey && response.survey._id) {
        const surveyId = response.survey._id;
        responsesBySurvey[surveyId] = (responsesBySurvey[surveyId] || 0) + 1;
      }
    });

    setAnalyticsData({
      totalResponses,
      pendingResponses,
      approvedResponses,
      rejectedResponses,
      averageRating,
      responsesByDate,
      responsesBySurvey,
      surveyTitles,
      ratingDistribution
    });
  };

  const filterResponsesByDate = (responses: SurveyResponse[], dateRange: string): SurveyResponse[] => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'last12months':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(0); // Tüm zamanlar
    }

    return responses.filter(response => {
      const responseDate = new Date(response.createdAt);
      return responseDate >= startDate && responseDate <= now;
    });
  };

  const generatePdf = async () => {
    try {
      setExportLoading(true);

      // Yeni PDF dökümanı oluştur
      const doc = new jsPDF();

      // Başlık
      doc.setFontSize(18);
      doc.text('Müşteri Analiz Raporu', 14, 20);

      // Tarih
      doc.setFontSize(12);
      doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);

      // Genel istatistikler
      doc.setFontSize(16);
      doc.text('Genel İstatistikler', 14, 45);

      const tableData = [
        ['Toplam Yanıt', analyticsData?.totalResponses.toString() || '0'],
        ['Onaylanmış Yanıtlar', analyticsData?.approvedResponses.toString() || '0'],
        ['Onay Bekleyen Yanıtlar', analyticsData?.pendingResponses.toString() || '0'],
        ['Reddedilen Yanıtlar', analyticsData?.rejectedResponses.toString() || '0'],
        ['Ortalama Değerlendirme', (analyticsData?.averageRating || 0).toFixed(2)]
      ];

      // autoTable modülünü doc'a uygula
      autoTable(doc, {
        startY: 50,
        head: [['Metrik', 'Değer']],
        body: tableData,
        margin: { top: 50 },
        styles: { fontSize: 10 }
      });

      // Anket bazlı yanıt sayıları
      let yPos = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFontSize(16);
      doc.text('Anket Başına Yanıt Sayıları', 14, yPos + 15);

      const surveyTableData = Object.keys(analyticsData?.responsesBySurvey || {}).map(surveyId => [
        analyticsData?.surveyTitles[surveyId] || surveyId,
        analyticsData?.responsesBySurvey[surveyId].toString() || '0'
      ]);

      // autoTable modülünü doc'a uygula
      autoTable(doc, {
        startY: yPos + 20,
        head: [['Anket', 'Yanıt Sayısı']],
        body: surveyTableData,
        styles: { fontSize: 10 }
      });

      // Değerlendirme dağılımı tablosu
      yPos = (doc as any).lastAutoTable?.finalY || 200;
      doc.setFontSize(16);
      doc.text('Değerlendirme Dağılımı', 14, yPos + 15);

      const ratingTableData = (analyticsData?.ratingDistribution || [0, 0, 0, 0, 0]).map((count, index) => [
        `${index + 1} Yıldız`,
        count.toString()
      ]);

      autoTable(doc, {
        startY: yPos + 20,
        head: [['Değerlendirme', 'Sayı']],
        body: ratingTableData,
        styles: { fontSize: 10 }
      });

      // Yeni sayfa - Tarih bazlı dağılım
      doc.addPage();

      doc.setFontSize(16);
      doc.text('Tarih Bazlı Yanıt Dağılımı', 14, 20);

      const dateTableData = Object.entries(analyticsData?.responsesByDate || {}).map(([date, count]) => [
        date,
        count.toString()
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Tarih', 'Yanıt Sayısı']],
        body: dateTableData,
        styles: { fontSize: 10 }
      });

      // PDF'i kaydet
      doc.save('musteri_analiz_raporu.pdf');

      showSnackbar('Rapor başarıyla oluşturuldu', 'success');
    } catch (error) {
      console.error('PDF oluşturulurken hata:', error);
      showSnackbar('PDF oluşturulurken bir hata oluştu', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const generateExcelReport = () => {
    try {
      setExportLoading(true);

      // Excel verisi hazırla (blob)
      let csvContent = "data:text/csv;charset=utf-8,";

      // Başlık
      csvContent += "Müşteri Analiz Raporu\n";
      csvContent += "Oluşturulma Tarihi: " + new Date().toLocaleDateString('tr-TR') + "\n\n";

      // Genel istatistikler
      csvContent += "Genel İstatistikler\n";
      csvContent += "Metrik,Değer\n";
      csvContent += `Toplam Yanıt,${analyticsData?.totalResponses || 0}\n`;
      csvContent += `Onaylanmış Yanıtlar,${analyticsData?.approvedResponses || 0}\n`;
      csvContent += `Onay Bekleyen Yanıtlar,${analyticsData?.pendingResponses || 0}\n`;
      csvContent += `Reddedilen Yanıtlar,${analyticsData?.rejectedResponses || 0}\n`;
      csvContent += `Ortalama Değerlendirme,${(analyticsData?.averageRating || 0).toFixed(2)}\n\n`;

      // Anket bazlı yanıt sayıları
      csvContent += "Anket Başına Yanıt Sayıları\n";
      csvContent += "Anket,Yanıt Sayısı\n";

      Object.keys(analyticsData?.responsesBySurvey || {}).forEach(surveyId => {
        csvContent += `${(analyticsData?.surveyTitles[surveyId] || surveyId).replace(/,/g, ';')},${analyticsData?.responsesBySurvey[surveyId] || 0}\n`;
      });

      csvContent += "\nDeğerlendirme Dağılımı\n";
      csvContent += "Değerlendirme,Sayı\n";
      (analyticsData?.ratingDistribution || []).forEach((count, index) => {
        csvContent += `${index + 1},${count}\n`;
      });

      // CSV dosyasını kaydet
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "musteri_analiz_raporu.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showSnackbar('Excel raporu başarıyla oluşturuldu', 'success');
    } catch (error) {
      console.error('Excel oluşturulurken hata:', error);
      showSnackbar('Excel oluşturulurken bir hata oluştu', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchData}>
          Yeniden Dene
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <AnalyticsIcon sx={{ mr: 2, fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" component="h1">
          Müşteri Analizi
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <DateRangeIcon sx={{ mr: 1 }} />
          Filtreleme Seçenekleri
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tarih Aralığı</InputLabel>
              <Select
                value={selectedDateRange}
                label="Tarih Aralığı"
                onChange={(e) => setSelectedDateRange(e.target.value)}
              >
                <MenuItem value="last7days">Son 7 Gün</MenuItem>
                <MenuItem value="last30days">Son 30 Gün</MenuItem>
                <MenuItem value="last90days">Son 90 Gün</MenuItem>
                <MenuItem value="last12months">Son 12 Ay</MenuItem>
                <MenuItem value="alltime">Tüm Zamanlar</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Anket</InputLabel>
              <Select
                value={selectedSurvey}
                label="Anket"
                onChange={(e) => setSelectedSurvey(e.target.value)}
              >
                <MenuItem value="all">Tüm Anketler</MenuItem>
                {surveys.map((survey) => (
                  <MenuItem key={survey._id} value={survey._id}>
                    {survey.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={fetchData}
            startIcon={<AnalyticsIcon />}
          >
            Veriyi Yenile
          </Button>

          <Box>
            <Button
              variant="contained"
              color="primary"
              onClick={generatePdf}
              startIcon={<DownloadIcon />}
              disabled={exportLoading}
              sx={{ mr: 2 }}
            >
              {exportLoading ? 'Oluşturuluyor...' : 'PDF Rapor İndir'}
            </Button>

            <Button
              variant="outlined"
              color="primary"
              onClick={generateExcelReport}
              startIcon={<SummarizeIcon />}
              disabled={exportLoading}
            >
              Excel İndir
            </Button>
          </Box>
        </Box>
      </Paper>

      {analyticsData && (
        <>
          {/* Özet Kartları */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {analyticsData.totalResponses}
                  </Typography>
                  <Typography variant="body1">Toplam Yanıt</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {analyticsData.approvedResponses}
                  </Typography>
                  <Typography variant="body1">Onaylı Yanıt</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {analyticsData.pendingResponses}
                  </Typography>
                  <Typography variant="body1">Bekleyen Yanıt</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {analyticsData.averageRating.toFixed(1)}
                  </Typography>
                  <Typography variant="body1">Ortalama Değerlendirme</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Grafikler yerine tablolar */}
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title="Yanıt Dağılımı"
                  avatar={<BarChartIcon color="primary" />}
                />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Durum</TableCell>
                          <TableCell align="right">Sayı</TableCell>
                          <TableCell align="right">Yüzde</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Toplam</TableCell>
                          <TableCell align="right">{analyticsData.totalResponses}</TableCell>
                          <TableCell align="right">%100</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Onaylanmış</TableCell>
                          <TableCell align="right">{analyticsData.approvedResponses}</TableCell>
                          <TableCell align="right">
                            {analyticsData.totalResponses > 0
                              ? `%${((analyticsData.approvedResponses / analyticsData.totalResponses) * 100).toFixed(1)}`
                              : '0%'
                            }
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Bekleyen</TableCell>
                          <TableCell align="right">{analyticsData.pendingResponses}</TableCell>
                          <TableCell align="right">
                            {analyticsData.totalResponses > 0
                              ? `%${((analyticsData.pendingResponses / analyticsData.totalResponses) * 100).toFixed(1)}`
                              : '0%'
                            }
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Reddedilen</TableCell>
                          <TableCell align="right">{analyticsData.rejectedResponses}</TableCell>
                          <TableCell align="right">
                            {analyticsData.totalResponses > 0
                              ? `%${((analyticsData.rejectedResponses / analyticsData.totalResponses) * 100).toFixed(1)}`
                              : '0%'
                            }
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title="Değerlendirme Dağılımı"
                  avatar={<PieChartIcon color="primary" />}
                />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Değerlendirme</TableCell>
                          <TableCell align="right">Sayı</TableCell>
                          <TableCell align="right">Görsel</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {analyticsData.ratingDistribution.map((count, index) => {
                          const totalRatings = analyticsData.ratingDistribution.reduce((sum, val) => sum + val, 0);
                          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

                          return (
                            <TableRow key={index}>
                              <TableCell>{index + 1} Yıldız</TableCell>
                              <TableCell align="right">{count}</TableCell>
                              <TableCell align="right" width="40%">
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={percentage}
                                    sx={{
                                      height: 8,
                                      width: '100%',
                                      bgcolor: 'grey.200',
                                      '& .MuiLinearProgress-bar': {
                                        bgcolor: index === 4 ? 'success.main' :
                                          index === 3 ? 'info.main' :
                                            index === 2 ? 'warning.main' :
                                              index === 1 ? 'orange' : 'error.main'
                                      }
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ ml: 1 }}>
                                    %{percentage.toFixed(1)}
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Anket Detayları"
                  avatar={<BarChartIcon color="primary" />}
                />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Anket</TableCell>
                          <TableCell align="right">Yanıt Sayısı</TableCell>
                          <TableCell align="right">Yüzde</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.keys(analyticsData.responsesBySurvey).map((surveyId) => {
                          const percentage = analyticsData.totalResponses > 0
                            ? (analyticsData.responsesBySurvey[surveyId] / analyticsData.totalResponses) * 100
                            : 0;

                          return (
                            <TableRow key={surveyId}>
                              <TableCell>{analyticsData.surveyTitles[surveyId] || surveyId}</TableCell>
                              <TableCell align="right">{analyticsData.responsesBySurvey[surveyId]}</TableCell>
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={percentage}
                                    sx={{ height: 8, width: '70%' }}
                                  />
                                  <Typography variant="body2" sx={{ ml: 1 }}>
                                    %{percentage.toFixed(1)}
                                  </Typography>
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Tarih Bazlı Yanıt Dağılımı"
                  avatar={<TimelineIcon color="primary" />}
                />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Tarih</TableCell>
                          <TableCell align="right">Yanıt Sayısı</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(analyticsData.responsesByDate)
                          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                          .map(([date, count]) => (
                            <TableRow key={date}>
                              <TableCell>{date}</TableCell>
                              <TableCell align="right">{count}</TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default BusinessAnalytics; 