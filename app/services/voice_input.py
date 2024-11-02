import json
import os
from openai import OpenAI
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

class VoiceToJsonConverter:
    def __init__(self, api_key: str):
        """初始化转换器"""
        self.client = OpenAI(api_key=api_key)

    def transcribe_audio(self, audio_data, filename) -> str:
        """使用Whisper模型转录音频数据"""
        try:
            if isinstance(audio_data, bytes):
                file_data = audio_data
            else:
                file_data = audio_data.read()
                
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=(filename, file_data),
                response_format="text",
                language="en"
            )
            return transcript
        except Exception as e:
            print(f"音频转录出错: {e}")
            raise

    def generate_json(self, text: str) -> list:
        """将文本转换为结构化的JSON数据"""
        system_prompt = """You are a helpful assistant that converts shopping lists into structured JSON data.
        For each food item mentioned, you should:
        1. Create a proper descriptive name
        2. Classify it into categories (protein, vegetables, fruit, dairy, grains, etc.)
        3. If mentioned, include quantity/weight, otherwise set to 0
        4. If mentioned, include units (kg, g, pieces, etc.), otherwise leave empty
        5. Add typical refrigerator shelf life in days (best_before_in_fridge)
        
        Return only the JSON array without any explanation."""
        user_prompt = f"""Convert the following shopping list into a JSON array. 
        Each item should have these fields: name, category, quantity_or_weight, unit, best_before_in_fridge.
        
        Shopping list: {text}"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7
            )
            
            content = response.choices[0].message.content.strip()
            
            # 确保内容是有效的JSON
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                # 尝试提取JSON部分
                start = content.find('[')
                end = content.rfind(']') + 1
                if start != -1 and end != 0:
                    return json.loads(content[start:end])
                raise
                
        except Exception as e:
            print(f"JSON生成出错: {e}")
            raise

    def process_voice_input(self, audio_data, filename, output_file: str = None) -> None:
        """处理语音输入并生成JSON文件"""
        try:
            # 转录音频
            print("正在转录音频...")
            transcript = self.transcribe_audio(audio_data, filename)
            print(f"转录结果: {transcript}")

            # 生成JSON
            print("正在生成JSON...")
            json_data = self.generate_json(transcript)

            # 如果没有指定输出文件，使用时间戳创建文件名
            if output_file is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = os.path.join('static', 'voice_receipt', f"shopping_list_{timestamp}.json")

            # 保存JSON文件
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
            
            print(f"处理完成！结果已保存到 {output_file}")
            
        except Exception as e:
            print(f"处理过程中出现错误: {e}")

def main():
    # 从环境变量获取API密钥
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("请设置OPENAI_API_KEY环境变量")
    
    # 创建转换器实例
    converter = VoiceToJsonConverter(api_key)
    
    # 这里不需要指定音频文件路径，因为我们将从请求中获取音频数据

if __name__ == "__main__":
    main()