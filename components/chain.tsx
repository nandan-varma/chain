'use client'
import React, { useEffect, useState } from 'react';
import { onValue, ref, set } from 'firebase/database';
import database from '@/lib/firebase';
import { Button } from './ui/button';

interface ChainProps {
    gameId: string
}

function initArray(h: number) {
    const array: number[][] = [];
    for (let i = 0; i < h; i++) {
        const row = Array(h).fill(0);
        array.push(row);
    }
    return array;
}

interface GameState {
    turn: number;
    array: number[][];
    owners: number[][];
}

const colors: string[] = ["white", "red", "blue", "green"];

function ChainGrid({ gameId }: ChainProps) {
    const [h, setH] = useState<number>(8);
    const [turn, setTurn] = useState<number>(1);
    const [array, setArray] = useState<number[][]>(initArray(h));
    const [owners, setOwners] = useState<number[][]>(initArray(h));
    const setGame = (id: string, new_state: GameState) => {
        const GameRef = ref(database, "chain/" + gameId);
        if (id) {
            onValue(GameRef, (snapshot) => {
                set(GameRef, new_state);
            });
        }
    }
    useEffect(() => {
        const GameRef = ref(database, "chain/" + gameId);
        if (gameId) {
            onValue(GameRef, (snapshot) => {
                if (snapshot.exists()) {
                    if (snapshot.val() != array) {
                        setGameState(snapshot.val());
                    }
                }
            })
        }
    }, []);

    function setGameState(gamestate: GameState) {
        setTurn(gamestate.turn);
        setArray(gamestate.array);
        setOwners(gamestate.owners);
    }

    function incrementTurn(t: number) {
        return (t + 1) % 4 || 1;
    }

    function increaseValue(row: number, col: number): void {
        if (owners[row][col] !== turn) {
            if (owners[row][col] === 0) {
                // Do something when the cell is unowned
            } else {
                alert(
                    `It is ${colors[turn]}'s turn. Wait for ${colors[owners[row][col]]}'s turn to change this.`
                );
                return;
            }
        }

        const newGameState: GameState = { turn: turn, array: [...array], owners: [...owners] };

        if (row === 0 || col === 0) {
            if (newGameState.array[row][col] === 2) {
                // Do something when the condition is met
            }
        }

        newGameState.array[row][col] += 1;
        newGameState.owners[row][col] = turn;

        setGameState(ChainReactionLogic({ turn: turn, array: array, owners: owners }));
        setTurn(prev => incrementTurn(prev));
    }

    function ChainReactionLogic(input: GameState): GameState {
        let ans: GameState = { turn: turn, array: [...input.array], owners: [...input.owners] };
        const rows = ans.array.length;
        const cols = ans.array[0].length;

        const isValidCell = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let limit = 4;
                if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) {
                    limit = 3;
                }
                if (
                    (r === 0 && c === 0) ||
                    (r === rows - 1 && c === 0) ||
                    (r === 0 && c === cols - 1) ||
                    (r === rows - 1 && c === cols - 1)
                ) {
                    limit = 2;
                }
                if (ans.array[r][c] >= limit) {
                    const distributeValue = 1;
                    ans.array[r][c] = 0;

                    const neighbors = [
                        [-1, 0],
                        [1, 0],
                        [0, -1],
                        [0, 1],
                    ];

                    for (const [dr, dc] of neighbors) {
                        const newRow = r + dr;
                        const newCol = c + dc;
                        if (isValidCell(newRow, newCol)) {
                            ans.array[newRow][newCol] += distributeValue;
                            ans.owners[newRow][newCol] = ans.owners[r][c];
                        }
                    }
                    ans.owners[r][c] = 0;
                }
            }
        }
        return ans;
    }

    return (
        <div className="mt-8">
            <div className='h-8 w-8 rounded-full' style={{ backgroundColor: colors[turn] }}></div> s turn
            <Button onClick={() => { setGame(gameId, { turn: turn, array: array, owners: owners }) }}>update cloud</Button>
            <table className="border-collapse">
                <tbody>
                    {array.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, colIndex) => (
                                <td
                                    key={colIndex}
                                    onClick={() => increaseValue(rowIndex, colIndex)}
                                    className="select-none border border-secondary-foreground p-2 cursor-pointers hover:bg-secondary-foreground hover:text-secondary font-extrabold"
                                    style={{ color: owners[rowIndex][colIndex] ? colors[(owners[rowIndex][colIndex])] : "" }}
                                >
                                    {cell}
                                    {/* .{colors[(owners[rowIndex][colIndex])]} */}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ChainGrid;