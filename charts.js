// Charts for data visualization
class DataCharts {
    constructor() {
        this.tempChart = null;
        this.signalChart = null;
        this.tempData = [];
        this.signalData = [];
        this.maxDataPoints = 20;
        
        this.init();
    }
    
    init() {
        // Initialize temperature chart
        this.initializeTemperatureChart();
        
        // Initialize signal chart
        this.initializeSignalChart();
        
        // Start updating charts
        this.startChartUpdates();
    }
    
    initializeTemperatureChart() {
        const ctx = document.getElementById('temp-chart').getContext('2d');
        
        // Initial data
        for (let i = 0; i < this.maxDataPoints; i++) {
            this.tempData.push({
                x: new Date(Date.now() - (this.maxDataPoints - i) * 1000),
                y: 23.0 + Math.random() * 2
            });
        }
        
        this.tempChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Temperature',
                    data: this.tempData,
                    borderColor: '#ff5252',
                    backgroundColor: 'rgba(255, 82, 82, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second',
                            displayFormats: {
                                second: 'HH:mm:ss'
                            }
                        },
                        display: false,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: false,
                        min: 20,
                        max: 30,
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                }
            }
        });
    }
    
    initializeSignalChart() {
        const ctx = document.getElementById('signal-chart').getContext('2d');
        
        // Initial data
        for (let i = 0; i < this.maxDataPoints; i++) {
            this.signalData.push({
                x: new Date(Date.now() - (this.maxDataPoints - i) * 1000),
                y: -65 + Math.random() * 10
            });
        }
        
        this.signalChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Signal Strength',
                    data: this.signalData,
                    borderColor: '#4fc3f7',
                    backgroundColor: 'rgba(79, 195, 247, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second',
                            displayFormats: {
                                second: 'HH:mm:ss'
                            }
                        },
                        display: false,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: false,
                        min: -80,
                        max: -50,
                        reverse: true,
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'nearest'
                }
            }
        });
    }
    
    updateTemperature(temp) {
        if (!this.tempChart) return;
        
        const now = new Date();
        this.tempData.push({ x: now, y: temp });
        
        if (this.tempData.length > this.maxDataPoints) {
            this.tempData.shift();
        }
        
        this.tempChart.update('none');
    }
    
    updateSignal(signal) {
        if (!this.signalChart) return;
        
        const now = new Date();
        this.signalData.push({ x: now, y: signal });
        
        if (this.signalData.length > this.maxDataPoints) {
            this.signalData.shift();
        }
        
        this.signalChart.update('none');
    }
    
    startChartUpdates() {
        // Auto-update charts every second
        setInterval(() => {
            if (this.tempChart) {
                this.tempChart.update('none');
            }
            if (this.signalChart) {
                this.signalChart.update('none');
            }
        }, 1000);
    }
    
    initialize() {
        // Re-initialize if needed
        if (!this.tempChart) {
            this.initializeTemperatureChart();
        }
        if (!this.signalChart) {
            this.initializeSignalChart();
        }
    }
}

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.charts = new DataCharts();
        console.log("📈 Charts initialized!");
    }, 1000);
});