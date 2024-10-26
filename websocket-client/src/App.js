import React from 'react';
import WebSocketUI from './WebsocketUI';
import './tailwind.css';


function App() {
  return (
    <div className="container mx-auto mt-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">WebSocket Chat</h1>
      <WebSocketUI />
    </div>
  );
}

export default App;