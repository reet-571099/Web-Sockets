#!/usr/bin/env python3
import asyncio
from websockets.server import serve
import random
import logging
import sys

# Set up logging with a more specific format to track duplicates
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [Process %(process)d] - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global flag to track if server is already running
server_running = False

async def handle_message(websocket):
    message_count = 0
    try:
        async for message in websocket:
            # Append random number between 1 and 1000 to the message
            random_num = random.randint(1, 1000)
            modified_message = f"{message} [Random: {random_num}]"
            
            # Send modified message back to client
            await websocket.send(modified_message)
            
            message_count += 1
            if message_count % 1000 == 0:
                logger.info(f"Processed {message_count} messages")
                
    except Exception as e:
        logger.error(f"Error handling message: {str(e)}")
    finally:
        logger.info(f"Connection closed. Total messages processed: {message_count}")

async def main():
    global server_running
    
    if server_running:
        logger.warning("Server is already running. Skipping duplicate startup.")
        return
        
    try:
        logger.info("Starting WebSocket server...")
        server = await serve(handle_message, "localhost", 8765)
        server_running = True
        
        logger.info("WebSocket server is running on ws://localhost:8765")
        
        # Keep the server running
        await asyncio.Future()  # run forever
        
    except OSError as e:
        if e.errno == 98:  # Address already in use
            logger.error("Port 8765 is already in use. Is another instance running?")
            sys.exit(1)
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        sys.exit(1)
    finally:
        server_running = False

if __name__ == "__main__":
    # Ensure only one instance runs
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
        sys.exit(0)