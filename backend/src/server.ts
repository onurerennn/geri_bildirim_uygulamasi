import { app } from './app';

const PORT = Number(process.env.PORT) || 5000; // Port 5000'e ayarlandı
const HOST = '0.0.0.0'; // Tüm IP adreslerinden gelen bağlantıları dinle

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: Check your IP address and use port ${PORT}`);
}); 
