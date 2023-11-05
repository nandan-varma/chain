'use client'
import React, { useEffect, useState } from 'react';

function initArray(h: number) {
    const array = [];
    for (let i = 0; i < h; i++) {
        const row = Array(h).fill(0);
        array.push(row);
    }
    return array;
}


interface ArrayTableProps { }

interface ArrayTableState {
    array: number[][];
}

function ChainGrid() {
    const [h,setH] = useState(8);
    const [array, setArray] = useState<ArrayTableState>({
        array: initArray(h),
    });
    useEffect(()=>{
        setArray({ array: ChainReactionLogic(array.array) });
    },[array])
    
    function increaseValue(row: number, col: number): void {
        const newArray = [...array.array];
        if(row == 0 || col == 0){
            if(newArray[row][col] == 2){

            }
        }
        newArray[row][col] += 1;
        setArray({ array: ChainReactionLogic(newArray) });
    }

    function ChainReactionLogic(arr: number[][]): number[][] {
        const rows = arr.length;
        const cols = arr[0].length;
    
        const isValidCell = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;
    
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let limit = 4;
                if(r == 0 || c == 0 || r == rows-1 || c == cols-1){
                    limit = 3
                }
                if((r == 0 && c == 0) || (r == rows-1 && c == 0) || (r == 0 && c == cols-1) || (r == rows-1 && c == cols-1) ){
                    limit = 2
                }
                if (arr[r][c] >= limit) {
                    const distributeValue = 1;
                    arr[r][c] = 0;
    
                    const neighbors = [
                        [-1, 0],
                        [1, 0], 
                        [0, -1],
                        [0, 1]  
                    ];
    
                    for (const [dr, dc] of neighbors) {
                        const newRow = r + dr;
                        const newCol = c + dc;
    
                        if (isValidCell(newRow, newCol)) {
                            arr[newRow][newCol] += distributeValue;
                        }
                    }
                }
            }
        }
        return arr;
    }

    return (
        <div className="mt-8">
            <table className="border-collapse">
                <tbody>
                    {array.array.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, colIndex) => (
                                <td
                                    key={colIndex}
                                    onClick={() => increaseValue(rowIndex, colIndex)}
                                    className="select-none border border-secondary-foreground p-2 cursor-pointers hover:bg-secondary-foreground hover:text-secondary"
                                >
                                    {cell}
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