import React, { useState, useRef, useEffect } from 'react';
import { Activity, Send, Server, Zap } from 'lucide-react';

// UI Components
const Button = ({ className, variant, children, disabled, ...props }) => (
  <button 
    className={`px-4 py-2 rounded font-medium ${
      disabled ? 'bg-gray-300 cursor-not-allowed' :
      variant === 'destructive' 
        ? 'bg-red-500 hover:bg-red-600 text-white' 
        : variant === 'outline'
        ? 'border border-gray-200 hover:bg-gray-50'
        : 'bg-blue-500 hover:bg-blue-600 text-white'
    } ${className}`}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
);

const Badge = ({ children, className }) => (
  <span className={`px-2 py-1 rounded-full text-sm font-medium ${className}`}>
    {children}
  </span>
);

const Card = ({ children, className }) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children }) => (
  <h3 className="text-lg font-semibold">
    {children}
  </h3>
);

const CardContent = ({ children, className }) => (
  <div className={`p-6 pt-0 ${className}`}>
    {children}
  </div>
);

const Input = ({ className, ...props }) => (
  <input
    className={`w-full px-3 py-2 border rounded-md ${props.disabled ? 'bg-gray-100' : ''} ${className}`}
    {...props}
  />
);

const WebSocketUI = () => {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [stats, setStats] = useState({
    sent: 0,
    received: 0,
    dropped: 0,
    startTime: null,
    endTime: null
  });
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const wsRef = useRef(null);
  const messageQueue = useRef(new Map());
  const lastMessageId = useRef(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, { text, type: 'system' }]);
  };

  const addMessage = (type, text) => {
    setMessages(prev => {
      const newMessages = [...prev, { text, type }];
      if (newMessages.length > 100) {
        return newMessages.slice(-100);
      }
      return newMessages;
    });
  };

  const connect = () => {
    if (!wsRef.current) {
      wsRef.current = new WebSocket('ws://localhost:8765');
      
      wsRef.current.onopen = () => {
        setConnected(true);
        addSystemMessage('Connected to server');
      };

      wsRef.current.onclose = () => {
        setConnected(false);
        addSystemMessage('Disconnected from server');
        wsRef.current = null;
      };

      wsRef.current.onmessage = (event) => {
        const response = event.data;
        const match = response.match(/Request \[(\d+)\]/);
        if (match) {
          const messageId = parseInt(match[1]);
          messageQueue.current.delete(messageId);
          setStats(prev => ({
            ...prev,
            received: prev.received + 1
          }));
        }
        addMessage('received', response);
      };
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const sendMessage = () => {
    if (wsRef.current && inputMessage) {
      lastMessageId.current++;
      const messageId = lastMessageId.current;
      const message = `Request [${messageId}] ${inputMessage}`;
      wsRef.current.send(message);
      messageQueue.current.set(messageId, message);
      addMessage('sent', message);
      setInputMessage('');
      setStats(prev => ({
        ...prev,
        sent: prev.sent + 1
      }));
    }
  };

  const runBenchmark = async () => {
    if (!wsRef.current || benchmarkRunning) return;

    setBenchmarkRunning(true);
    setStats({
      sent: 0,
      received: 0,
      dropped: 0,
      startTime: new Date(),
      endTime: null
    });
    messageQueue.current.clear();
    
    const totalMessages = 10000;
    addSystemMessage(`Starting benchmark: sending ${totalMessages} messages...`);

    try {
      for (let i = 1; i <= totalMessages; i++) {
        if (!wsRef.current) break;

        const message = `Request [${i}] Benchmark message ${i}`;
        wsRef.current.send(message);
        messageQueue.current.set(i, message);
        
        setStats(prev => ({
          ...prev,
          sent: prev.sent + 1
        }));

        if (i % 1000 === 0) {
          addSystemMessage(`Sent ${i} messages...`);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      addSystemMessage(`Error during benchmark: ${error.message}`);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dropped = messageQueue.current.size;
      setStats(prev => ({
        ...prev,
        dropped,
        endTime: new Date()
      }));
      
      addSystemMessage(`Benchmark completed!`);
      setBenchmarkRunning(false);
    }
  };

  const getBenchmarkStats = () => {
    if (!stats.startTime) return null;
    
    const duration = stats.endTime 
      ? ((stats.endTime - stats.startTime) / 1000).toFixed(2)
      : ((new Date() - stats.startTime) / 1000).toFixed(2);
    
    const messagesPerSecond = (stats.sent / duration).toFixed(2);
    
    return {
      duration,
      messagesPerSecond,
      successRate: ((stats.received / stats.sent) * 100).toFixed(2)
    };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* [Rest of the JSX remains exactly the same as in the previous version] */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Server className="h-6 w-6 text-blue-500" />
              <CardTitle>WebSocket Testing Dashboard</CardTitle>
            </div>
            <Badge 
              className={`px-4 py-1 ${connected ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}
            >
              {connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant={connected ? "destructive" : "default"}
            onClick={connected ? disconnect : connect}
            className="w-32"
          >
            {connected ? 'Disconnect' : 'Connect'}
          </Button>
          <Button
            variant="outline"
            onClick={runBenchmark}
            disabled={!connected || benchmarkRunning}
            className="w-40"
          >
            <Zap className="mr-2 h-4 w-4" />
            {benchmarkRunning ? 'Running...' : 'Run Benchmark'}
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Messages Sent', value: stats.sent, icon: Send },
          { label: 'Messages Received', value: stats.received, icon: Activity },
          { label: 'Messages Dropped', value: stats.dropped, icon: Zap },
          { 
            label: 'Success Rate', 
            value: stats.sent ? `${((stats.received / stats.sent) * 100).toFixed(2)}%` : '0%',
            icon: Server 
          }
        ].map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <stat.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Benchmark Results */}
      {getBenchmarkStats() && (
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">Benchmark Results</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-6">
            {[
              { label: 'Duration', value: `${getBenchmarkStats().duration}s` },
              { label: 'Messages/Second', value: getBenchmarkStats().messagesPerSecond },
              { label: 'Success Rate', value: `${getBenchmarkStats().successRate}%` }
            ].map((stat, index) => (
              <div key={index} className="space-y-1">
                <div className="text-sm text-gray-600">{stat.label}</div>
                <div className="text-xl font-semibold">{stat.value}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Messages Area */}
      <Card className="h-[32rem]">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  msg.type === 'sent' 
                    ? 'bg-blue-100 ml-auto max-w-[80%]' 
                    : msg.type === 'received'
                    ? 'bg-gray-100 max-w-[80%]'
                    : 'bg-yellow-100 text-center mx-auto max-w-[90%]'
                }`}
              >
                <p className={`text-sm ${msg.type === 'sent' ? 'text-right' : ''}`}>
                  {msg.text}
                </p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="flex gap-3 mt-4 pt-4 border-t">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={!connected || benchmarkRunning}
              placeholder={connected ? "Type a message..." : "Connect to start messaging"}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!connected || !inputMessage || benchmarkRunning}
              className="w-24"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebSocketUI;