// 設定管理
let GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

// config.jsから設定を読み込む（存在する場合）
if (typeof window.CONFIG !== 'undefined' && window.CONFIG.GEMINI_API_KEY) {
    GEMINI_API_KEY = window.CONFIG.GEMINI_API_KEY;
}

// ゲーム状態
let gameState = {
    isPlaying: false,
    score: 0,
    timeLeft: 30,
    currentText: '',
    currentAnswer: false,
    timer: null,
    currentStage: 'haiku'
};

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

// 音数カウント関数（ひらがな・カタカナ対応）
function countMora(text) {
    const cleanText = text.replace(/[\n\r\s]/g, '');
    const smallKana = /[ぁぃぅぇぉゃゅょっァィゥェォャュョッ]/g;
    
    let count = 0;
    for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        
        if (smallKana.test(char)) {
            continue;
        }
        
        if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(char)) {
            count++;
        }
    }
    
    return count;
}

// 575判定関数
function check575(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length !== 3) {
        return false;
    }
    
    const counts = lines.map(line => countMora(line.trim()));
    return counts[0] === 5 && counts[1] === 7 && counts[2] === 5;
}

// ステージ選択
function selectStage(stage) {
    gameState.currentStage = stage;
    document.getElementById('stageSelect').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    const stageInfo = document.getElementById('currentStage');
    if (stage === 'haiku') {
        stageInfo.textContent = '🌸 俳句ステージ';
    } else {
        stageInfo.textContent = '💭 日常ステージ';
    }
}

// ステージ選択に戻る
function backToStageSelect() {
    if (gameState.isPlaying) {
        if (!confirm('ゲーム中です。ステージ選択に戻りますか？')) {
            return;
        }
        endGame();
    }
    
    document.getElementById('stageSelect').style.display = 'block';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('ending').style.display = 'none';
    resetGame();
}

// Gemini APIを使用してテキスト生成
async function generateTextWithGemini() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.log('API key not configured, using fallback');
        return generateTextFallback();
    }

    try {
        const shouldBe575 = Math.random() < 0.4;
        
        let prompt;
        if (gameState.currentStage === 'haiku') {
            // 俳句ステージ
            if (shouldBe575) {
                prompt = `日本語で5-7-5の音律の俳句を1つ作成してください。季語を含めて、自然や日常の美しい瞬間を表現してください。改行で3行に分けて出力してください。例：
桜散り
風に舞い踊る
花びらよ`;
            } else {
                const patterns = [
                    '日本語で5-7-7の音律の短詩を作成してください。季語を含めて改行で3行に分けて出力してください。',
                    '日本語で7-5-5の音律の短詩を作成してください。季語を含めて改行で3行に分けて出力してください。',
                    '日本語で4-6-4の音律の短詩を作成してください。季語を含めて改行で3行に分けて出力してください。'
                ];
                prompt = patterns[Math.floor(Math.random() * patterns.length)];
            }
        } else {
            // 日常ステージ
            if (shouldBe575) {
                prompt = `日常生活や仕事で思わず口にしてしまいそうな、5-7-5の音律になっている一言を作成してください。俳句らしくない、普通の会話や独り言のような内容で、改行で3行に分けて出力してください。例：
コーヒーが
冷めてしまった
また作ろう

電車が
遅れているよ
困ったな`;
            } else {
                const patterns = [
                    '日常生活の一言で5-7-7の音律になるものを作成してください。改行で3行に分けて出力してください。',
                    '日常生活の一言で7-5-5の音律になるものを作成してください。改行で3行に分けて出力してください。',
                    '日常生活の一言で4-6-4の音律になるものを作成してください。改行で3行に分けて出力してください。',
                    '日常生活の一言で6-8-6の音律になるものを作成してください。改行で3行に分けて出力してください。'
                ];
                prompt = patterns[Math.floor(Math.random() * patterns.length)];
            }
        }

        console.log('Calling Gemini API...');
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.9,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 2048,
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error ${response.status}:`, errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid API response structure');
        }
        
        const generatedText = data.candidates[0].content.parts[0].text.trim();
        const is575 = check575(generatedText);
        
        console.log('Generated text:', generatedText);
        console.log('Is 575:', is575);
        
        return {
            text: generatedText,
            is575: is575
        };

    } catch (error) {
        console.error('Gemini API Error:', error);
        console.log('Falling back to local generation');
        return generateTextFallback();
    }
}

// フォールバック用のテキスト生成
function generateTextFallback() {
    const haikuSamples = [
        // 俳句ステージ用 575の俳句サンプル
        { text: "さくらさく\nかぜにまいおどる\nはなびらよ", is575: true, stage: 'haiku' },
        { text: "あおぞらに\nしろいくもがながれ\nとりがなく", is575: true, stage: 'haiku' },
        { text: "ゆめみてる\nよるのしずかなとき\nつきひかり", is575: true, stage: 'haiku' },
        { text: "かぜふいて\nみどりのはっぱゆれ\nなつのひび", is575: true, stage: 'haiku' },
        { text: "あめふって\nみずたまりにうつる\nそらのいろ", is575: true, stage: 'haiku' },
        
        // 俳句ステージ用 575でないサンプル
        { text: "ねこがいる\nにわのすみっこでねて\nひなたぼっこしてる", is575: false, stage: 'haiku' },
        { text: "あかいはなが\nさいている\nきれいだな", is575: false, stage: 'haiku' },
        { text: "おおきなき\nちいさなとり\nそらをとぶ", is575: false, stage: 'haiku' },
        
        // 日常ステージ用 575のサンプル
        { text: "コーヒーが\nつめたくなった\nまたいれよう", is575: true, stage: 'daily' },
        { text: "でんしゃが\nおくれているよ\nこまったな", is575: true, stage: 'daily' },
        { text: "しごとが\nおわらないよう\nがんばろう", is575: true, stage: 'daily' },
        { text: "あさごはん\nたべるのわすれた\nおなかすく", is575: true, stage: 'daily' },
        { text: "かぎどこだ\nさがしてもない\nこまったな", is575: true, stage: 'daily' },
        
        // 日常ステージ用 575でないサンプル
        { text: "きょうはいそがしい\nしごとがおおい\nつかれた", is575: false, stage: 'daily' },
        { text: "ひるごはん\nなにをたべようかな\nまよってしまう", is575: false, stage: 'daily' },
        { text: "あめがふってる\nかさがない\nこまった", is575: false, stage: 'daily' },
        { text: "でんわが\nなっている\nだれだろう", is575: false, stage: 'daily' }
    ];
    
    const shouldBe575 = Math.random() < 0.4;
    const filteredSamples = haikuSamples.filter(sample => 
        sample.is575 === shouldBe575 && sample.stage === gameState.currentStage
    );
    const randomSample = filteredSamples[Math.floor(Math.random() * filteredSamples.length)];
    
    console.log('Using fallback generation:', randomSample);
    return randomSample;
}

// ゲーム開始
function startGame() {
    gameState.isPlaying = true;
    gameState.score = 0;
    gameState.timeLeft = 30;
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('yesBtn').disabled = false;
    document.getElementById('noBtn').disabled = false;
    document.getElementById('ending').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    updateDisplay();
    nextQuestion();
    startTimer();
}

// タイマー開始
function startTimer() {
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        updateDisplay();
        
        if (gameState.timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// 次の問題
function nextQuestion() {
    if (!gameState.isPlaying) return;
    
    document.getElementById('textDisplay').innerHTML = '生成中...';
    document.getElementById('yesBtn').disabled = true;
    document.getElementById('noBtn').disabled = true;
    
    generateTextWithGemini().then(generated => {
        if (!gameState.isPlaying) return;
        
        gameState.currentText = generated.text;
        gameState.currentAnswer = generated.is575;
        
        document.getElementById('textDisplay').innerHTML = gameState.currentText.replace(/\n/g, '<br>');
        document.getElementById('result').textContent = '';
        document.getElementById('yesBtn').disabled = false;
        document.getElementById('noBtn').disabled = false;
    }).catch(error => {
        console.error('Text generation error:', error);
        const generated = generateTextFallback();
        gameState.currentText = generated.text;
        gameState.currentAnswer = generated.is575;
        
        document.getElementById('textDisplay').innerHTML = gameState.currentText.replace(/\n/g, '<br>');
        document.getElementById('result').textContent = '';
        document.getElementById('yesBtn').disabled = false;
        document.getElementById('noBtn').disabled = false;
    });
}

// 回答処理
function answer(userAnswer) {
    if (!gameState.isPlaying) return;
    
    const isCorrect = userAnswer === gameState.currentAnswer;
    const resultElement = document.getElementById('result');
    
    if (isCorrect) {
        gameState.score++;
        resultElement.textContent = '正解！';
        resultElement.className = 'result correct';
    } else {
        resultElement.textContent = `不正解... (正解: ${gameState.currentAnswer ? '575である' : '575でない'})`;
        resultElement.className = 'result incorrect';
    }
    
    updateDisplay();
    
    setTimeout(() => {
        nextQuestion();
    }, 1000);
}

// 表示更新
function updateDisplay() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('timeLeft').textContent = gameState.timeLeft;
    
    const progressPercent = ((30 - gameState.timeLeft) / 30) * 100;
    document.getElementById('progressBar').style.width = progressPercent + '%';
}

// ゲーム終了
function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timer);
    
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('ending').style.display = 'block';
    document.getElementById('finalScore').textContent = gameState.score;
    
    const endingContainer = document.getElementById('ending');
    const endingTitle = document.getElementById('endingTitle');
    const endingMessage = document.getElementById('endingMessage');
    
    if (gameState.score >= 12) {
        endingContainer.className = 'ending ending-excellent';
        endingTitle.textContent = '🏆 俳句マスター！';
        endingMessage.textContent = '素晴らしい！あなたは真の俳句の達人です。575の感覚が完璧に身についていますね！';
    } else if (gameState.score >= 9) {
        endingContainer.className = 'ending ending-good';
        endingTitle.textContent = '🌟 俳句上級者！';
        endingMessage.textContent = 'とても良い成績です！俳句の基本をしっかり理解していますね。';
    } else if (gameState.score >= 6) {
        endingContainer.className = 'ending ending-normal';
        endingTitle.textContent = '📚 俳句学習者';
        endingMessage.textContent = '良い調子です！もう少し練習すれば、さらに上達しそうですね。';
    } else {
        endingContainer.className = 'ending ending-poor';
        endingTitle.textContent = '🌱 俳句初心者';
        endingMessage.textContent = '俳句は奥が深いものです。575のリズムを意識して、また挑戦してみてください！';
    }
}

// ゲームリセット
function resetGame() {
    gameState = {
        isPlaying: false,
        score: 0,
        timeLeft: 30,
        currentText: '',
        currentAnswer: false,
        timer: null,
        currentStage: gameState.currentStage || 'haiku'
    };
    
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('yesBtn').disabled = true;
    document.getElementById('noBtn').disabled = true;
    document.getElementById('textDisplay').textContent = 'スタートボタンを押してゲームを開始してください';
    document.getElementById('result').textContent = '';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('ending').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    
    updateDisplay();
}

// キーボードショートカット
document.addEventListener('keydown', (event) => {
    if (!gameState.isPlaying) return;
    
    if (event.key === 'y' || event.key === 'Y') {
        answer(true);
    } else if (event.key === 'n' || event.key === 'N') {
        answer(false);
    }
});

// 初期表示更新
updateDisplay();

// 初期状態でステージ選択画面を表示
document.getElementById('stageSelect').style.display = 'block';
document.getElementById('gameArea').style.display = 'none';

// config.jsを動的に読み込み
const configScript = document.createElement('script');
configScript.src = 'config.js';
configScript.onload = function() {
    if (typeof window.CONFIG !== 'undefined' && window.CONFIG.GEMINI_API_KEY) {
        GEMINI_API_KEY = window.CONFIG.GEMINI_API_KEY;
        console.log('config.js loaded successfully');
    }
};
configScript.onerror = function() {
    console.log('config.js not found, using default configuration');
};
document.head.appendChild(configScript);
