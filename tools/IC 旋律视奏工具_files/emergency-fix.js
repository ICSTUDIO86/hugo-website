/*!
 * IC Studio 视奏工具 - 紧急修复工具
 * Emergency Fix Tool
 * 
 * Copyright © 2025. All rights reserved. Igor Chen - icstudio.club
 * 
 * Author: Igor Chen
 * Website: https://icstudio.club
 * Email: icstudio@fastmail.com
 * 
 * 紧急修复：检查并修复可能的问题
 */

console.log('🔧 紧急修复工具加载');

// 检查关键函数是否存在
function checkFunctions() {
    const functions = [
        'generateMelodyData',
        'generate68MeasureWithBeatClarity',
        'SeededRandom'
    ];
    
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} 存在`);
        } else {
            console.error(`❌ ${funcName} 不存在`);
        }
    });
}

// 测试基本生成
function testBasicGeneration() {
    console.log('🧪 测试基本生成功能');
    
    try {
        // 临时设置用户设置，测试结束后恢复
        const originalSettings = window.userSettings;
        window.userSettings = {
            customRange: { min: 60, max: 72 },
            maxJump: 12,
            allowedRhythms: ['16th'],
            allowUpbeat: false,
            allowDottedNotes: false
        };
        
        console.log('用户设置:', window.userSettings);
        
        // 尝试生成
        const result = generateMelodyData(1, 'C', '6/8', 'treble', 12345);
        
        if (result) {
            console.log('✅ 生成成功');
            console.log('XML长度:', result.musicXML?.length);
            
            if (result.musicXML) {
                const has16th = result.musicXML.includes('<type>sixteenth</type>');
                console.log('包含十六分音符:', has16th);
            }
        } else {
            console.error('❌ 生成返回null');
        }

        window.userSettings = originalSettings;
        
    } catch (error) {
        console.error('❌ 生成错误:', error);
        console.error('错误堆栈:', error.stack);
    }
}

// 修复缺失的函数
function addMissingFunctions() {
    // 如果midiToNoteInfo不存在，创建一个简单版本
    if (typeof window.midiToNoteInfo !== 'function') {
        window.midiToNoteInfo = function(midi) {
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const octave = Math.floor(midi / 12) - 1;
            const noteIndex = midi % 12;
            
            return {
                step: notes[noteIndex].replace('#', ''),
                alter: notes[noteIndex].includes('#') ? 1 : null,
                octave: octave,
                midi: midi
            };
        };
        console.log('✅ 创建了midiToNoteInfo函数');
    }
}

// 自动执行修复
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 开始紧急修复检查');
    addMissingFunctions();
    checkFunctions();
    
    // 延迟测试，确保所有脚本加载完成
    setTimeout(() => {
        testBasicGeneration();
    }, 1000);
});

if (typeof window !== 'undefined') {
    window.emergencyFix = {
        checkFunctions,
        testBasicGeneration,
        addMissingFunctions
    };
}
