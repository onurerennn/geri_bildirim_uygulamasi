import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CustomerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSurveys = async () => {
            try {
                setLoading(true);
                const response = await api.surveys.getAll('CUSTOMER');
                setSurveys(response || []);
            } catch (err: any) {
                setError(err.message || 'Anketler yüklenirken bir hata oluştu');
            } finally {
                setLoading(false);
            }
        };

        fetchSurveys();
    }, []);

    if (!user || user.role !== 'CUSTOMER') {
        navigate('/login');
        return null;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white shadow-sm rounded-lg p-6">
                        <div className="text-red-600 text-center">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-6">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                            Hoş Geldiniz, {user.name}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Yanıtlayabileceğiniz anketleri aşağıda görebilirsiniz
                        </p>
                    </div>
                </div>

                {surveys.length === 0 ? (
                    <div className="bg-white shadow-sm rounded-lg p-6 text-center">
                        <p className="text-gray-500">Henüz yanıtlanacak anket bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {surveys.map((survey: any) => (
                            <div key={survey._id} className="bg-white shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow">
                                <h3 className="text-lg font-medium text-gray-900">{survey.title}</h3>
                                <p className="mt-2 text-sm text-gray-500">{survey.description}</p>
                                <div className="mt-4">
                                    <button
                                        onClick={() => navigate(`/survey/${survey._id}`)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Anketi Yanıtla
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDashboard; 