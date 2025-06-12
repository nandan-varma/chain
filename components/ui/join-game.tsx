import * as React from "react";
import { Button } from "@/components/ui/button";

interface JoinGameProps {
  onJoin: (gameId: string) => void;
}

export function JoinGame({ onJoin }: JoinGameProps) {
  const [input, setInput] = React.useState("");

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (input) onJoin(input);
      }}
      className="flex gap-2"
    >
      <input
        className="border rounded px-2 py-1 text-sm"
        placeholder="Enter Game ID"
        value={input}
        onChange={e => setInput(e.target.value)}
      />
      <Button type="submit" variant="secondary">
        Join
      </Button>
    </form>
  );
}
