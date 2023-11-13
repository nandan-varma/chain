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

let colors = [
    "white",
    "red",
    "blue",
    "green",
]

interface ArrayTableProps { }

interface ArrayTableState {
    array: number[][];
    owners: number[][];
}

function ChainGrid() {
    const [h,setH] = useState(8);
    const [array, setArray] = useState<ArrayTableState>({
        array: initArray(h),
        owners: initArray(h)
    });
    const [turn,SetTurn] = useState(1);
    useEffect(()=>{
        setArray( ChainReactionLogic(array));
    },[array])
    
    function increaseValue(row: number, col: number): void {
        if(array.owners[row][col] != turn){
            if(array.owners[row][col] == 0){
                
            }else{
                alert( `it is ${colors[turn]}'s turn wait for ${colors[array.owners[row][col]]}'s turn to change this`);
                return;
            }
        }

        const newArray: ArrayTableState = {array: [...array.array],owners: [...array.owners]};
        if(row == 0 || col == 0){
            if(newArray.array[row][col] == 2){

            }
        }
        newArray.array[row][col] += 1;
        newArray.owners[row][col] = turn;
        setArray((prev)=>{
            SetTurn((prevTurn)=>{
                let t = (prevTurn+1)%4
                if(t==0){
                    return 1;
                }
                return t;
            });
            return ChainReactionLogic(newArray)
        }

            );
    }

    function ChainReactionLogic(input: ArrayTableState): ArrayTableState {
        let ans: ArrayTableState = {array: [...input.array],owners: [...input.owners]};
        const rows = ans.array.length;
        const cols = ans.array[0].length;
    
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
                if (ans.array[r][c] >= limit) {
                    const distributeValue = 1;
                    ans.array[r][c] = 0;
                    
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
            <div className='h-8 w-8 rounded-full' style={{backgroundColor: colors[turn]}}></div>'s turn
            <table className="border-collapse">
                <tbody>
                    {array.array.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, colIndex) => (
                                <td
                                    key={colIndex}
                                    onClick={() => increaseValue(rowIndex, colIndex)}
                                    className="select-none border border-secondary-foreground p-2 cursor-pointers hover:bg-secondary-foreground hover:text-secondary font-extrabold"
                                    style={{color: array.owners[rowIndex][colIndex] ? colors[(array.owners[rowIndex][colIndex])] : ""}}
                                >
                                    {cell}
                                    {/* .{colors[(array.owners[rowIndex][colIndex])]} */}
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