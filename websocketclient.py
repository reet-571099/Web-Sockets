#!/usr/bin/env python3
import asyncio
import websockets
import logging
from datetime import datetime
import sys

# Set up logging with process ID for tracking duplicates
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [Process %(process)d] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global flag to track if client is already running
client_running = False

async def send_messages():
    global client_running
    
    if client_running:
        logger.warning("Client is already running. Skipping duplicate execution.")
        return
        
    client_running = True
    uri = "ws://localhost:8765"
    total_messages = 10000
    received_messages = 0
    
    try:
        async with websockets.connect(uri) as websocket:
            start_time = datetime.now()
            
            for i in range(1, total_messages + 1):
                message = f"Request [{i}] Hello world!"
                try:
                    await websocket.send(message)
                    response = await websocket.recv()
                    received_messages += 1
                    
                    if i % 1000 == 0:
                        logger.info(f"Progress: {i}/{total_messages} messages processed")
                        logger.info(f"Last response: {response}")
                    
                except Exception as e:
                    logger.error(f"Error processing message {i}: {str(e)}")
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"\nTest Summary:")
            logger.info(f"Total messages sent: {total_messages}")
            logger.info(f"Total messages received: {received_messages}")
            logger.info(f"Messages dropped: {total_messages - received_messages}")
            logger.info(f"Total time: {duration:.2f} seconds")
            logger.info(f"Messages per second: {total_messages/duration:.2f}")
            
    except ConnectionRefusedError:
        logger.error("Could not connect to the server. Is it running?")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        sys.exit(1)
    finally:
        client_running = False

if __name__ == "__main__":
    try:
        asyncio.run(send_messages())
    except KeyboardInterrupt:
        logger.info("Client shutdown requested")
        sys.exit(0)