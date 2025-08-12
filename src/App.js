import React, { useState, useEffect, useRef } from 'react';
import useSound from 'use-sound';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import './App.css';


function App() {



  const [playStart, { stop: stopStart }] = useSound('/sounds/start.mp3', { 
    volume: 0.7,
    onend: () => console.log('Som terminou naturalmente') // Opcional para debug
  });
  const [hasStarted, setHasStarted] = useState(false);
  const [playCorrect] = useSound('/sounds/correct.mp3', { volume: 0.7 });
  const [playWrong] = useSound('/sounds/wrong.mp3', { volume: 0.7 });
  const [playAudience] = useSound('/sounds/start.mp3', { volume: 0.6 });
  const [playCards] = useSound('/sounds/start.mp3', { volume: 0.5 });
  const [playSkip] = useSound('/sounds/skip.mp3', { volume: 0.5 });
  const [playWin] = useSound('/sounds/win.mp3', { volume: 0.8 });
  const [playLose] = useSound('/sounds/wrong.mp3', { volume: 0.8 });
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [eliminatedOptions, setEliminatedOptions] = useState([]);
  const [audienceVotes, setAudienceVotes] = useState(null);
  const [skipsRemaining, setSkipsRemaining] = useState(2); // Inicia com 2 pulos
  const [usedHelps, setUsedHelps] = useState({
    audience: false,
    cards: false,
    skip: false,
  });
  const [audienceHelp, setAudienceHelp] = useState(null);
  const soundTimer = useRef(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8000/api/questions/')
      .then(res => {
        setQuestions(res.data);
        setIsLoading(false); // Dados carregados
      })
      .catch(err => {
        console.log(err);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoading && questions.length > 0) {
      playStart(); 
       // Configura o timer para parar após 5 segundos
      soundTimer.current = setTimeout(() => {
        stopStart();
        console.log('Som interrompido manualmente'); // Debug
      }, 5000);

      // Limpeza quando o componente desmontar ou dependências mudarem
      return () => {
        clearTimeout(soundTimer.current);
        stopStart();
      };
    }
  }, [isLoading, questions]);

  useEffect(() => {
  if (questions.length > 0) {
    setTotalQuestions(questions.length);
  }
}, [questions]);
  const getRank = () => {
    if (score >= 90) return "🏆 Gênio";
    if (score >= 70) return "👍 Bom";
    if (score >= 50) return "🤔 Mediano";
    return "👎 Precisa estudar";
  };

  const handleSkip = () => {
    playSkip(); // Som de pulo
    if (skipsRemaining > 0 && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSkipsRemaining(skipsRemaining - 1);
      setSelectedOption(null);
      setEliminatedOptions([]);
      setUsedHelps({ ...usedHelps, skip: true }); // Marca como usado no painel de ajuda
    }
  };


  const handleAudienceHelp = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const options = ['A', 'B', 'C', 'D'];
    const correctOption = currentQuestion.correct_option;
    
    // Probabilidades (60% para a correta, distribui os 40% restantes)
    const votes = {
      A: 0, B: 0, C: 0, D: 0
    };

    // 5 pessoas votando
    for (let i = 0; i < 5; i++) {
      const random = Math.random();
      if (random < 0.6) {
        votes[correctOption]++; // 60% de chance para a correta
      } else {
        // Distribui os votos restantes entre as erradas
        const wrongOptions = options.filter(opt => opt !== correctOption);
        const randomWrongOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
        votes[randomWrongOption]++;
      }
    }

    setAudienceVotes(votes);
    setUsedHelps({ ...usedHelps, audience: true });
  };

  const handleCardsHelp = () => {
    const currentQuestion = questions[currentQuestionIndex];
    const allOptions = ['A', 'B', 'C', 'D'];
    const correctOption = currentQuestion.correct_option;

    // Passo 1: Filtrar apenas opções INCORRETAS
    const wrongOptions = allOptions.filter(option => option !== correctOption);

    // Passo 2: Embaralhar e selecionar 2 opções erradas aleatórias
    const shuffledWrongOptions = [...wrongOptions].sort(() => Math.random() - 0.5);
    const optionsToEliminate = shuffledWrongOptions.slice(0, 2);

    setEliminatedOptions(optionsToEliminate);
    setUsedHelps({ ...usedHelps, cards: true });
  };

  const handleAnswer = (option) => {
    setSelectedOption(option);
    const currentQuestion = questions[currentQuestionIndex];

    setTimeout(() => {
      if (option === currentQuestion.correct_option) {
        

        playCorrect(); // Som de acerto

        const newCorrectAnswers = correctAnswers + 1;
        setCorrectAnswers(newCorrectAnswers);
        setScore(score + currentQuestion.level * 1000);

        // Calcula novo percentual: (acertos / total de perguntas respondidas) * 100
        const newScore = Math.round((newCorrectAnswers / (currentQuestionIndex + 1)) * 100);
        setScore(newScore);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedOption(null);
          setEliminatedOptions([]);
          setAudienceVotes(null); // Reset da votação aqui!
          
        } else {
          playWin(); // Som de vitória
          setGameOver(true);
        }
      } else {
        const newScore = Math.round((correctAnswers / (currentQuestionIndex + 1)) * 100);
        setScore(newScore);
        playWrong(); // Som de erro
        setGameOver(true);
      }
    }, 1500);
  };




  const handleHelp = (helpType) => {
    if (helpType === 'audience') {
      setAudienceHelp({
        A: questions[currentQuestionIndex].correct_option === 'A' ? 70 : 10,
        B: questions[currentQuestionIndex].correct_option === 'B' ? 70 : 10,
        C: questions[currentQuestionIndex].correct_option === 'C' ? 70 : 10,
        D: questions[currentQuestionIndex].correct_option === 'D' ? 70 : 10,
      });
    }
    setUsedHelps({ ...usedHelps, [helpType]: true });
  };

  const resetGame = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setGameOver(false);
    setSelectedOption(null);
    setUsedHelps({ audience: false, cards: false, skip: false });
    setEliminatedOptions([]); // Reset adicional aqui
    setSkipsRemaining(2); // Reinicia os pulos
    setAudienceVotes(null); // Reset adicional aqui
    setCorrectAnswers(0);
  };

  if (questions.length === 0) return <div className="loading">Carregando...</div>;

  const currentQuestion = questions[currentQuestionIndex];

  // Variantes de animação
  const questionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20 },
  };

  const optionVariants = {
    hover: { scale: 1.03 },
    tap: { scale: 0.98 },
  };
  if (!hasStarted) {
    return (
      <motion.div 
        className="start-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
            <img 
          src="/images/logo.png" 
          alt="DS do Milhão" 
          className="logo-main"
        />
        <motion.button
          className="start-button"
          onClick={() => {
            setHasStarted(true);
            playStart();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="start-button-inner">
            <span className="start-icon">🎬</span>
            <span className="start-text">INICIAR JOGO</span>
          </div>
        </motion.button>
      </motion.div>
    );
  }
  return (
    <div className="app">
      <header className="header">
        <img 
          src="/images/logo.png" 
          alt="Show do Milhão" 
          className="logo-header"
        />
        <div className="score">
          <div className="score-percent">{score}%</div>
          <div className="score-detail">
            {correctAnswers}/{totalQuestions} acertos
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {!gameOver ? (
          <motion.main
            key={currentQuestionIndex}
            className="question-area"
            variants={questionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h1
              className="question-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {currentQuestion.text}
            </motion.h1>

            <div className="options">
              {['A', 'B', 'C', 'D'].map((option) => (
                eliminatedOptions.includes(option) ? (
                  <motion.div
                    key={option}
                    className="option-btn eliminated"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0.3, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="option-letter">{option}</span>
                    <span className="option-text">❌</span> {/* Ícone de "eliminado" */}
                  </motion.div>
                ) : (
                  <motion.button
                    key={option}
                    className={`option-btn ${selectedOption === option ? 
                      (option === currentQuestion.correct_option ? 'correct' : 'wrong') : ''}`}
                    onClick={() => !selectedOption && handleAnswer(option)}
                    disabled={selectedOption || eliminatedOptions.includes(option)}
                    variants={optionVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <span className="option-letter">{option}</span>
                    <span className="option-text">{currentQuestion[`option_${option.toLowerCase()}`]}</span>
                  </motion.button>
                )
              ))}
            </div>

            {audienceVotes && (
              <motion.div 
                className="audience-help"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <h3>Público votou (5 pessoas):</h3>
                {['A', 'B', 'C', 'D'].map(option => (
                  <div key={option} className="audience-bar-container">
                    <span>{option}: {audienceVotes[option]} votos</span>
                    <motion.div
                      className="audience-bar"
                      initial={{ width: 0 }}
                      animate={{ width: `${(audienceVotes[option] / 5) * 100}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                ))}
              </motion.div>
            )}
          </motion.main>
        ) : (
          <motion.div
            className="game-over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {score >= 1000000 && (
              <Confetti
                width={window.innerWidth}
                height={window.innerHeight}
                recycle={false}
                numberOfPieces={500}
              />
            )}
            <h2>{score >= 1000000 ? '🎉 Você ganhou ! 🎉' : 'Fim de Jogo!'}</h2>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
               {getRank()}
            </motion.p>
            <motion.button
              className="reset-btn"
              onClick={resetGame}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Jogar novamente
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="helps">
        <motion.button
          className={`help-btn ${usedHelps.audience ? 'used' : ''}`}
          onClick={() => !usedHelps.audience && handleAudienceHelp()}
          disabled={usedHelps.audience}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          🗣️ Especialistas
        </motion.button>
        <motion.button
          className={`help-btn ${usedHelps.cards ? 'used' : ''}`}
          onClick={() => !usedHelps.cards && handleCardsHelp()}
          disabled={usedHelps.cards}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          🃏 Cartas
        </motion.button>
        <motion.button
          className={`help-btn ${usedHelps.skip || skipsRemaining === 0 ? 'used' : ''}`}
          onClick={handleSkip}
          disabled={usedHelps.skip || skipsRemaining === 0}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ⏭️ Pular ({skipsRemaining}/2)
        </motion.button>
      </footer>
    </div>
  );
}

export default App;