import { ReactWordcloud } from '@cp949/react-wordcloud';
import { useEffect, useState } from 'react';
import axios from "axios";

type BackendWord = {
    word: string;
    frequency: number;
}

const WordCloud = () => {
    const [words, setWords] = useState<{ text: string; value: number }[]>([]);
    const [error, setError] = useState<string>('');


    useEffect(() => {
        axios
            .get("http://localhost:5000/stats/word_frequencies")
            .then(res => {
                const mapped = res.data.map((d: BackendWord) => (
                    {text: d.word, value: d.frequency}
                ));
                setWords(mapped);
            })
            .catch(err => {
                setError(err);
            });

    }, [])

    return (
        <div>
            <ReactWordcloud
                words={words}
            />
        
            <p>{error}</p>
        </div>
    );
};

export default WordCloud;