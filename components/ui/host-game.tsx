import * as React from "react";
import { Button } from "@/components/ui/button";

interface HostGameProps {
  onHost: (gameId: string) => void;
}

export function HostGame({ onHost }: HostGameProps) {
  const [hosting, setHosting] = React.useState(false);
  const [gameId, setGameId] = React.useState("");

  const handleHost = () => {
    const id = (Math.floor(Math.random() * 9000) + 1000).toString();
    setGameId(id);
    setHosting(true);
    onHost(id);
  };

  if (hosting) return null;

  return (
    <Button onClick={handleHost} variant="default">
      Host Game
    </Button>
  );
}
