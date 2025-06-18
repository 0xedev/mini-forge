import { useState, useEffect, useRef } from "react";
import axios from "axios";
import CommandButtons from "./CommandButtons";
import { sdk } from "@farcaster/frame-sdk";
import { useConnect, useAccount } from "wagmi";

interface Message {
  text: string;
  isUser?: boolean;
  buttons?: { label: string; callback: string }[][];
}

function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Welcome to ForgeBot! Use buttons or type commands." },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userFid, setUserFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { connect, connectors } = useConnect();
  const { isConnected: isAccountConnected } = useAccount();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const context = await sdk.context;
        const fid = context.user.fid;
        setUserFid(fid);
        setUsername(context.user.username || "player");
        sessionStorage.setItem("fid", fid.toString());
      } catch {
        setUsername("player");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const autoConnectInMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        if (inMiniApp && !isAccountConnected) {
          const farcasterConnector = connectors.find(
            (c) => c.id === "farcasterFrame"
          );
          if (farcasterConnector) {
            connect({ connector: farcasterConnector });
          }
        }
      } catch (error) {
        console.error("Error during auto-connect:", error);
      }
    };
    autoConnectInMiniApp();
  }, [isAccountConnected, connect, connectors]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fid = sessionStorage.getItem("fid");
    if (fid) {
      setUserFid(parseInt(fid));
    }
  }, []);

  const sendCommand = async (command: string) => {
    const fid = sessionStorage.getItem("fid");
     console.log("sendCommand: fid =", fid, "command =", command); // Log fid and command
    if (!fid) {
      setMessages([
        ...messages,
        { text: "Please authenticate via Farcaster." },
      ]);
      return;
    }

    setMessages([...messages, { text: command, isUser: true }]);
    setIsLoading(true);
    try {
      const { data } = await axios.post(
        "https://forgeback-production.up.railway.app/api/chat/command",
        { command, fid }
      );
      setMessages((prev) => [
        ...prev,
        { text: data.response, buttons: data.buttons },
      ]);
    }catch (error) {
  console.error("Error processing command:", error);
  if (axios.isAxiosError(error)) {
    console.log("Axios error details:", {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data,
      } : null,
    });
  }
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  setMessages((prev) => [
    ...prev,
    { text: `Error: ${errorMessage}` },
  ]);
}
finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendCommand(input);
      setInput("");
    }
  };

  const handleButtonClick = (callback: string) => {
    sendCommand(callback);
  };

  return (
    <div className="text-black flex flex-col h-[695px] w-[424px] bg-gray-100 p-4 font-sans text-sm">
      <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg p-2 shadow">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-2 m-1 rounded ${msg.isUser ? "bg-blue-100 ml-8" : "bg-gray-200 mr-8"}`}
          >
            <pre className="whitespace-pre-wrap">{msg.text}</pre>

            {i === 0 && userFid && (
              <p className="text-xs text-gray-500 mt-1">Your Farcaster ID: {userFid}</p>
            )}

            {i === 0 && username && (
              <p className="text-xs text-gray-500">Logged in as: {username}</p>
            )}

            {msg.buttons && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.buttons.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex gap-2">
                    {row.map((btn, btnIdx) => (
                      <button
                        key={btnIdx}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                        onClick={() => handleButtonClick(btn.callback)}
                        disabled={isLoading}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <CommandButtons onCommand={sendCommand} />
      <form onSubmit={handleSubmit} className="flex mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command..."
          className="flex-1 p-2 rounded-l border border-gray-300"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded-r"
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
