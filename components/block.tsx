interface BlockProps {
    num: number;
    color: string;
}

export function Block({ num }: BlockProps) {
    return (
        <>
            <div className="">
                <p>{num}</p>
            </div>
        </>
    )
}