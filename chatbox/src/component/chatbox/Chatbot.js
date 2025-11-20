import { useState, useRef, useEffect } from "react";
import { marked } from "marked";
import classes from "./Chatbot.module.css";
export default function ChatBot() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! Ask me anything!" },
  ]);
  const [input, setInput] = useState("");

  const abortRef = useRef(null);
  const messageEndRef = useRef(null);
  const messagesBoxRef = useRef(null);
  const botTextRef = useRef(""); 
  const isAutoScrollRef = useRef(true);

  const [loadingText, setLoadingText] = useState("");

  const handleScroll = () => {
    const box = messagesBoxRef.current;
    if (!box) return;
    const isAtBottom =
      box.scrollTop + box.clientHeight >= box.scrollHeight - 10;

    isAutoScrollRef.current = isAtBottom;
  };

  useEffect(() => {
    if (isAutoScrollRef.current) {
      messageEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    botTextRef.current = "";
    const botIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      { role: "bot", text: `<div>${loadingText}</div>` },
    ]);

    let dots = "";
    setLoadingText("Loading");

    const loadingInterval = setInterval(() => {
      dots = dots.length < 3 ? dots + "." : "";
      const txt = "Loading" + dots;
      setLoadingText(txt);

      setMessages((prev) => {
        const updated = [...prev];
        updated[botIndex] = { role: "bot", text: `<div>${txt}</div>` };
        return updated;
      });
    }, 300);

    const apiKey = "AIzaSyAZVXFvF3x49CabH5xilO4cSRXa6fd4QHQ";
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse";

    const body = {
      contents: [{ parts: [{ text: userMsg.text }] }],
    };

    abortRef.current = new AbortController();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: abortRef.current.signal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const streamInterval = setInterval(() => {
      setMessages((prev) => {
        const updated = [...prev];
        updated[botIndex] = {
          role: "bot",
          text: botTextRef.current,
        };
        return updated;
      });
    }, 25);

    clearInterval(loadingInterval);
    setLoadingText("");

    setMessages((prev) => {
      const updated = [...prev];
      updated[botIndex] = { role: "bot", text: "" };
      return updated;
    });

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (let line of lines) {
        if (!line.startsWith("data: ")) continue;

        const json = line.replace("data: ", "");
        if (json === "[DONE]") continue;

        try {
          const data = JSON.parse(json);
          const chunk =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

          for (const ch of chunk) {
            botTextRef.current += ch;
            await new Promise((r) => setTimeout(r, 8));
          }
        } catch (err) {
          console.error("JSON parse error:", err);
        }
      }
    }

    clearInterval(streamInterval);
    setMessages((prev) => {
      const updated = [...prev];
      updated[botIndex] = { role: "bot", text: botTextRef.current };
      return updated;
    });
  };

  return (
    <div className={classes.wrapper}>
      <h1 className={classes.title}>Chatbot</h1>

      <div className={classes.container}>
        <div
          className={classes.messagesBox}
          ref={messagesBoxRef}
          onScroll={handleScroll}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`${classes.message} ${
                msg.role === "user"
                  ? classes.userMessage
                  : classes.botMessage
              }`}
              dangerouslySetInnerHTML={{
                __html: marked.parse(msg.text),
              }}
            ></div>
          ))}

          <div ref={messageEndRef}></div>
        </div>

        <div className={classes.inputBox}>
          <input
            className={classes.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
          />
          <button className={classes.button} onClick={handleSend}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
