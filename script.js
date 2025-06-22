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

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
    // 全体の文字数（モーラ数）をカウント
    const totalMora = countMora(text);
    
    // 17文字（モーラ）であれば575と判定
    return totalMora === 17;
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
        const shouldBe575 = Math.random() < 0.6;
        console.log('Should be 575:', shouldBe575);
        
        let prompt;
        if (gameState.currentStage === 'haiku') {
            // 俳句ステージ
            if (shouldBe575) {
                prompt = `あなたは俳句の専門家です。合計17文字（モーラ）になる俳句または短詩を1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "俳句または短詩の内容（改行を含めても可）",
  "is575": true
}

季語を含めて、自然や日常の美しい瞬間を表現してください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
句読点は入れないでください。`;
            } else {
                const patterns = [
                    `あなたは短詩の専門家です。合計16文字または18文字（モーラ）になる短詩を1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "短詩の内容（改行を含めても可）",
  "is575": false
}

短詩は季語を含めて、自然や日常の美しい瞬間を表現してください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
句読点は入れないでください。`,
                    `あなたは短詩の専門家です。合計15文字または19文字（モーラ）になる短詩を1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "短詩の内容（改行を含めても可）",
  "is575": false
}

短詩は季語を含めて、自然や日常の美しい瞬間を表現してください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
句読点は入れないでください。`,
                    `あなたは短詩の専門家です。合計14文字（モーラ）になる短詩を1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "短詩の内容（改行を含めても可）",
  "is575": false
}

短詩は季語を含めて、自然や日常の美しい瞬間を表現してください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
句読点は入れないでください。`
                ];
                prompt = patterns[Math.floor(Math.random() * patterns.length)];
            }
        } else {
            // 日常ステージ
            if (shouldBe575) {
                prompt = `あなたは日常会話の専門家です。日常生活や仕事で思わず口にしてしまいそうな、合計17文字（モーラ）になる一言を1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "日常の一言",
  "is575": true
}

俳句らしくない、普通の会話や独り言のような内容にしてください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
「ー」や句読点は入れないでください。`;
            } else {
                const patterns = [
                    `あなたは日常会話の専門家です。日常生活の一言で合計16文字または18文字（モーラ）になるものを1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "日常の一言",
  "is575": false
}

普通の会話や独り言のような内容にしてください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
「ー」や句読点は入れないでください`,
                    `あなたは日常会話の専門家です。日常生活の一言で合計15文字または19文字（モーラ）になるものを1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "日常の一言",
  "is575": false
}

普通の会話や独り言のような内容にしてください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
「ー」や句読点は入れないでください`,
                    `あなたは日常会話の専門家です。日常生活の一言で合計14文字（モーラ）になるものを1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "日常の一言",
  "is575": false
}

普通の会話や独り言のような内容にしてください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
「ー」や句読点は入れないでください`,
                    `あなたは日常会話の専門家です。日常生活の一言で合計20文字（モーラ）になるものを1つだけ作成し、以下のJSON形式で返してください。
{
  "answer": "日常の一言",
  "is575": false
}

普通の会話や独り言のような内容にしてください。
回答は必ずJSON形式のみで、余計な説明は含めないでください。
漢字は使わず、ひらがなのみで作成してください。
「ー」や句読点は入れないでください`
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
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.8,
                    maxOutputTokens: 100
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
        
        let generatedText = data.candidates[0].content.parts[0].text.trim();
        
        try {
            // JSONとしてパース
            const jsonResponse = extractJSON(generatedText);
            console.log('Parsed JSON:', jsonResponse);
            
            if (jsonResponse && jsonResponse.answer && typeof jsonResponse.is575 === 'boolean') {
                // APIからの判定を使用
                return {
                    text: jsonResponse.answer,
                    is575: jsonResponse.is575
                };
            } else {
                throw new Error('Invalid JSON structure');
            }
        } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            
            // JSONパースに失敗した場合は、テキストをクリーンアップして自前で判定
            generatedText = cleanGeneratedText(generatedText);
            const is575 = check575(generatedText);
            
            console.log('Fallback to text cleaning. Generated text:', generatedText);
            console.log('Is 575:', is575);
            
            return {
                text: generatedText,
                is575: is575
            };
        }

    } catch (error) {
        console.error('Gemini API Error:', error);
        console.log('Falling back to local generation');
        return generateTextFallback();
    }
}

// JSONを抽出する関数
function extractJSON(text) {
    try {
        // テキスト内のJSON部分を抽出するための正規表現
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        // 直接JSONとしてパース
        return JSON.parse(text);
    } catch (e) {
        console.error('JSON extraction failed:', e);
        throw e;
    }
}

// 生成されたテキストから余計な返答を除去
function cleanGeneratedText(text) {
    // 不要な前置きや返答を除去
    const unwantedPhrases = [
        '承知しました',
        'わかりました',
        '了解しました',
        'かしこまりました',
        '以下のように',
        '以下の通り',
        'こちらです',
        'どうぞ',
        '：',
        '。',
        'です',
        'ます',
        '例：',
        '答え：',
        '回答：'
    ];
    
    let cleanedText = text;
    
    // 不要なフレーズを除去
    unwantedPhrases.forEach(phrase => {
        cleanedText = cleanedText.replace(new RegExp(phrase, 'g'), '');
    });
    
    // 行ごとに分割して処理
    let lines = cleanedText.split('\n').filter(line => line.trim() !== '');
    
    // 3行以外の場合は最初の3行を取得
    if (lines.length > 3) {
        lines = lines.slice(0, 3);
    }
    
    // 各行をクリーンアップ
    lines = lines.map(line => {
        return line.trim()
            .replace(/^[・\-\*\d+\.]\s*/, '') // 箇条書き記号を除去
            .replace(/^「|」$/g, '') // 引用符を除去
            .replace(/^\s*[\-:：]\s*/, '') // コロンやハイフンを除去
    }).filter(line => line.length > 0);
    
    return lines.join('\n');
}

// フォールバック用のテキスト生成
function generateTextFallback() {
    const haikuSamples = [
        // 俳句ステージ用 575の俳句サンプル
        { text: "さくらさく\nかぜにおどるぞ\nはなびらよ", is575: true, stage: 'haiku' },
        { text: "あおぞらに\nしらくもながるる\nとりがなく", is575: true, stage: 'haiku' },
        { text: "ゆめみてる\nよるのしずかき\nつきひかり", is575: true, stage: 'haiku' },
        { text: "かぜふいて\nみどりのはっぱ\nなつのひび", is575: true, stage: 'haiku' },
        { text: "あめふって\nみずにうつるぜ\nそらのいろ", is575: true, stage: 'haiku' },
        
        // 俳句ステージ用 575でないサンプル
        { text: "ねこがいる\nにわのすみっこでねて\nひなたぼっこしてる", is575: false, stage: 'haiku' },
        { text: "あかいはなが\nさいている\nきれいだな", is575: false, stage: 'haiku' },
        { text: "おおきなき\nちいさなとり\nそらをとぶ", is575: false, stage: 'haiku' },
        
        // 日常ステージ用 575のサンプル
        { text: "こーひーが\nつめたくなった\nまたいれよう", is575: true, stage: 'daily' },
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
        
        // 575で正解の場合は特別演出
        if (gameState.currentAnswer === true) {
            show575Animation();
            resultElement.textContent = '575！正解！';
            resultElement.className = 'result correct special-575';
        } else {
            resultElement.textContent = '正解！';
            resultElement.className = 'result correct';
        }
    } else {
        resultElement.textContent = `不正解... (正解: ${gameState.currentAnswer ? '575である' : '575でない'})`;
        resultElement.className = 'result incorrect';
    }
    
    updateDisplay();
    
    setTimeout(() => {
        nextQuestion();
    }, 1000);
}

// 575特別演出
function show575Animation() {
    // 575アニメーション要素を作成
    const animation = document.createElement('div');
    animation.className = 'animation-575';
    animation.textContent = '5️⃣7️⃣5️⃣';
    
    // ゲームコンテナに追加
    const gameContainer = document.querySelector('.game-container');
    gameContainer.appendChild(animation);
    
    // 音効果を再生
    play575Sound();
    
    // アニメーション後に要素を削除
    setTimeout(() => {
        if (animation.parentNode) {
            animation.parentNode.removeChild(animation);
        }
    }, 2000);
    
    // 紙吹雪エフェクト
    createConfetti();
}

// 575音効果（Web Audio APIを使用）
function play575Sound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 3つの音を順番に再生（5-7-5のリズム）
        const frequencies = [523.25, 659.25, 523.25]; // C5, E5, C5
        const durations = [0.2, 0.3, 0.2]; // 5-7-5の長さを表現
        
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + durations[index]);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + durations[index]);
            }, index * 150);
        });
    } catch (error) {
        console.log('Audio not supported:', error);
    }
}

// 紙吹雪エフェクト
function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
    const gameContainer = document.querySelector('.game-container');
    
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        
        gameContainer.appendChild(confetti);
        
        // アニメーション後に削除
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 4000);
    }
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
