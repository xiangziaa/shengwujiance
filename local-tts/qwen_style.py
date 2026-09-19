"""Natural speaking pace; never post-process the generated audio speed."""
INSTRUCTION = '使用标准普通话，以智能检测系统助手的口吻播报。声音清晰、平稳、简洁、专业，带少量亲和感。语速适中，句间停顿明确，语调起伏克制。不要聊天口吻，不要撒娇，不要气声，不要夸张情绪，也不要逐字机械朗读。'

def pace(rate):
    return 'slow' if rate < 1 else 'fast' if rate > 1 else 'normal'

def instruction(rate):
    direction = {
        'slow': '语速稍慢，从容清晰，保持词语连贯，不要逐字拖长。',
        'normal': '语速适中，',
        'fast': '语速稍快，表达紧凑利落，保持吐字清晰，不吞字，不省略内容。',
    }[pace(rate)]
    return INSTRUCTION.replace('语速适中，', direction)
