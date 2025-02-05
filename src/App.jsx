import React, {useEffect, useRef, useState} from "react";
import {PortfolioChart} from "./PortfolioChart";
import axios from "axios";

const INITIAL_CANDLES = 300; // Количество свечей для начальной загрузки
const LOAD_MORE_CANDLES = 300; // Количество свечей, загружаемых при подгрузке истории

const getStoredPortfolio = () => {
  const savedPortfolio = localStorage.getItem("portfolio");
  return savedPortfolio ? JSON.parse(savedPortfolio) : [
    {ticker: "BTC", amount: 1},
    {ticker: "ETH", amount: 2},
  ];
};

const fetchFuturesTickers = async () => {
  try {
    const response = await axios.get(
      "https://api.bybit.com/v5/market/instruments-info?category=linear"
    );
    
    if (!response.data?.result?.list) {
      console.error("Ошибка получения списка фьючерсов");
      return [];
    }
    
    // Оставляем только названия монет (без USDT)
    return response.data.result.list
      .map((item) => item.symbol.replace("USDT", ""))
      .filter((ticker, index, self) => self.indexOf(ticker) === index); // Убираем дубликаты
  } catch (error) {
    console.error("Ошибка загрузки фьючерсов:", error);
    return [];
  }
};

function App() {
  const [portfolio, setPortfolio] = useState(getStoredPortfolio);
  const [tempPortfolio, setTempPortfolio] = useState(portfolio); // Временный портфель для редактирования
  const [chartData, setChartData] = useState([]);
  const availableIntervals = ["1", "3", "5", "15", "30", "60", "120", "240", "360", "720", "D", "W", "M"];
  const [selectedInterval, setSelectedInterval] = useState("D");
  const isFetchingRef = useRef(false);
  const portfolioRef = useRef(portfolio);
  const [chartKey, setChartKey] = useState(0); // Ключ для ререндера графика
  const [availableTickers, setAvailableTickers] = useState([]);
  const [logMessage, setLogMessage] = useState("");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  
  useEffect(() => {
    const loadTickers = async () => {
      const tickers = await fetchFuturesTickers();
      setAvailableTickers(tickers);
    };
    loadTickers();
    
    // Отслеживание изменения размера окна
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  useEffect(() => {
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
    portfolioRef.current = portfolio;
  }, [portfolio]);
  
  const fetchHistoricalData = async (symbol, interval, limit, startTime = null) => {
    try {
      let url = `https://api.bybit.com/v5/market/kline?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`;
      if (startTime) {
        url += `&startTime=${startTime * 1000}`;
      }
      console.log(`🚀 Отправка API-запроса: ${url}`);
      const response = await axios.get(url);
      if (!response.data?.result?.list) {
        console.error(`Ошибка загрузки данных для ${symbol}: Пустой ответ от API`);
        return [];
      }
      
      return response.data.result.list.map(candle => ({
        time: Math.floor(parseInt(candle[0]) / 1000),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
      }));
    } catch (error) {
      console.error(`Ошибка загрузки данных для ${symbol}:`, error);
      return [];
    }
  };
  
  const calculateWeightedPrice = async (limit, startTime = null) => {
    const coinData = await Promise.all(
      portfolioRef.current.map(({ticker}) => fetchHistoricalData(ticker, selectedInterval, limit, startTime))
    );
    
    const minTimes = coinData.map(data => Math.min(...data.map(c => c.time)));
    const minCommonTime = Math.max(...minTimes);
    const hasTruncation = minTimes.some(time => time !== minCommonTime);
    
    if (hasTruncation) {
      const limitingAssetIndex = minTimes.findIndex(time => time === minCommonTime);
      const limitingAsset = portfolioRef.current[limitingAssetIndex]?.ticker || null;
      
      const formattedDate = new Date(minCommonTime * 1000).toLocaleString();
      const message = `📉 Данные обрезаны до ${formattedDate} из-за монеты: ${limitingAsset}`;
      
      setLogMessage(message);
      console.log(message);
    } else {
      setLogMessage("");
    }
    
    const weightedData = {};
    coinData.forEach((data, index) => {
      data
        .filter(({time}) => time >= minCommonTime)
        .forEach(({time, open, high, low, close}) => {
          if (!weightedData[time]) {
            weightedData[time] = {totalOpen: 0, totalHigh: 0, totalLow: 0, totalClose: 0, totalWeight: 0};
          }
          const weight = portfolioRef.current[index].amount;
          weightedData[time].totalOpen += open * weight;
          weightedData[time].totalHigh += high * weight;
          weightedData[time].totalLow += low * weight;
          weightedData[time].totalClose += close * weight;
          weightedData[time].totalWeight += weight;
        });
    });
    
    return Object.entries(weightedData)
      .map(([time, {totalOpen, totalHigh, totalLow, totalClose, totalWeight}]) => ({
        time: parseInt(time),
        open: totalWeight ? totalOpen / totalWeight : 0,
        high: totalWeight ? totalHigh / totalWeight : 0,
        low: totalWeight ? totalLow / totalWeight : 0,
        close: totalWeight ? totalClose / totalWeight : 0,
      }))
      .sort((a, b) => a.time - b.time);
  };
  
  useEffect(() => {
    const loadInitialData = async () => {
      const initialData = await calculateWeightedPrice(INITIAL_CANDLES);
      setChartData(initialData);
    };
    loadInitialData();
  }, [portfolio, selectedInterval]);
  
  const loadMoreHistory = async (oldestTime) => {
    if (isFetchingRef.current) return null;
    isFetchingRef.current = true;
    console.log(`⏳ Загружаем историю с точки ${oldestTime}`);
    
    const newStartTime = oldestTime - LOAD_MORE_CANDLES * 24 * 60 * 60;
    const newData = await calculateWeightedPrice(LOAD_MORE_CANDLES, newStartTime);
    if (oldestTime === Math.min(...newData.map(c => c.time))) return;
    
    setChartData(prevData => [...newData, ...prevData].filter((v, i, a) => a.findIndex(t => t.time === v.time) === i).sort((a, b) => a.time - b.time));
    isFetchingRef.current = false;
    return Math.min(...newData.map(c => c.time));
  };
  
  const handleInputChange = (index, field, value) => {
    setTempPortfolio((prev) => {
      const newPortfolio = [...prev];
      newPortfolio[index][field] = field === "ticker" ? value.toUpperCase() : parseFloat(value);
      return newPortfolio;
    });
  };
  
  const addAsset = () => {
    const newPortfolio = [...portfolio, {ticker: "BTC", amount: 1}];
    setTempPortfolio(newPortfolio);
  };
  
  const removeAsset = (index) => {
    const newPortfolio = portfolio.filter((_, i) => i !== index);
    setTempPortfolio(newPortfolio);
  };
  
  const savePortfolio = () => {
    setPortfolio(tempPortfolio); // Только после нажатия "Сохранить" обновляем основной портфель
    isFetchingRef.current = false; // 🔄 Сбрасываем флаг загрузки данных
    setChartKey((prev) => prev + 1); // 🔄 Меняем ключ для перерисовки `PortfolioChart`
    console.log("✅ Портфель сохранен, график перерисован.");
  };
  
  // Медиа-запрос: если экран меньше 768px — мобильная версия, иначе — десктоп
  const isMobile = windowWidth < 768;
  
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center", // Центрируем весь контент
      justifyContent: "center",
      height: "100vh", // Высота на весь экран
      width: "100vw", // Заполняем всю ширину экрана
      textAlign: "center",
    }}>
      <h1 style={{marginBottom: "20px", marginTop: "200px"}}>🚀 Мой Портфель</h1>
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        width: "100%",
      }}>
        
        {/* Таймфрейм - отдельная строка */}
        <select
          value={selectedInterval}
          onChange={(e) => setSelectedInterval(e.target.value)}
          style={{width: "150px", padding: "5px", fontSize: "16px", textAlign: "center"}}
        >
          {availableIntervals.map((interval) => (
            <option key={interval} value={interval}>{interval}</option>
          ))}
        </select>
        
        {/* Блок для активов */}
        {tempPortfolio.map((asset, index) => (
          <div key={index} style={{
            display: "flex",
            flexDirection: "row", // Располагаем элементы в ряд
            alignItems: "center",
            gap: "10px",
            width: "100%",
            justifyContent: "center"
          }}>
            <select
              value={asset.ticker}
              onChange={(e) => handleInputChange(index, "ticker", e.target.value)}
              style={{width: "120px", padding: "5px", fontSize: "16px"}}
            >
              {availableTickers.map((ticker) => (
                <option key={ticker} value={ticker}>{ticker}</option>
              ))}
            </select>
            
            <input
              type="number"
              value={asset.amount}
              onChange={(e) => handleInputChange(index, "amount", parseFloat(e.target.value))}
              style={{width: "80px", padding: "5px", fontSize: "16px", textAlign: "center"}}
            />
            
            <button
              onClick={() => removeAsset(index)}
              style={{
                padding: "5px",
                fontSize: "16px",
                cursor: "pointer",
                background: "transparent",
                border: "none"
              }}
            >
              ❌
            </button>
          </div>
        ))}
      </div>
      
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "14px",
        margin: "20px 0",
      }}>
        <button style={{fontSize: isMobile ? "10px" : "14px"}} onClick={addAsset}>➕ Добавить актив</button>
        <button style={{fontSize: isMobile ? "10px" : "14px"}} onClick={savePortfolio}>💾 Сохранить изменения</button>
      </div>
      
      <div style={{marginBottom: "20px", fontSize: isMobile ? "8px" : "14px", color: logMessage ? "gray" : "black"}}>
        {logMessage}
      </div>
      
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "80vw", // Ограничиваем ширину графика
        height: "500px", // Даем высоту для графика
      }}>
        {chartData.length > 0 ? (
          <PortfolioChart key={chartKey} data={chartData} loadMoreHistory={loadMoreHistory}/>
        ) : (
          <p>Загрузка данных...</p>
        )}
      </div>
    </div>
  );
}

export default App;