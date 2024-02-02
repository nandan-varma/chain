'use client'
import database from '@/lib/firebase';
import { onValue, ref, set } from 'firebase/database';
import React, { createContext, useState, useContext, useEffect } from 'react';

const GameContext = createContext(
    {
        array: {
            array: [[0]],
            owners: [[0]]
        }, colors: ["red"],
        turn: 1,
        increaseValue: (row: number, col: number) => { },
        setGame: (id: string) => { }
    });
export const useGameContext = () => useContext(GameContext);

function initArray(h: number) {
    const array = [];
    for (let i = 0; i < h; i++) {
        const row = Array(h).fill(0);
        array.push(row);
    }
    return array;
}

const colors: string[] = ["white", "red", "blue", "green"];

interface GameState {
    array: number[][];
    owners: number[][];
}

export const GameProvider = ({ children }: any) => {
    const [h, setH] = useState(8);
    const [array, setArray] = useState<GameState>({
        array: initArray(h),
        owners: initArray(h),
    });
    // useEffect(() => {
    // }, [GameId]);
    const setGame = (id: string) => {
        if (id) {
            const GameRef = ref(database,"chain/"+id);
            onValue(GameRef, (snapshot) => {
                if (snapshot.exists()) {
                    setArray(snapshot.val());
                } else {
                    set(GameRef,array);
                }
            });
        }
    }
    const [turn, setTurn] = useState(1);

    // useEffect(() => {
    //     setArray((prev)=>{
    //         let newArray = ChainReactionLogic(prev);
    //         if(newArray.array === prev.array)
    //         {console.log("h");
    //             return prev}
    //         return newArray});
    // }, [array]);



    return (
        <GameContext.Provider value={{ array, colors, turn, increaseValue, setGame }}>
            {children}
        </GameContext.Provider>
    );
};
