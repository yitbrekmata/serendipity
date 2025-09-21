export default function EndingScene(){

    return (
    <div className = "flex w-full max-w-lg items-center flex-col justify-center fade-in mx-auto">
        <img
            src = "ending_image.png"
            className = ""
        >
        </img>

        <a href = "https://services.google.com/fh/files/blogs/google_ai_red_team_digital_final.pdf" 
        className = "text-[#ff3131] font-mono text-l whitespace-pre-wrap break-words neon-hover-red w-full max-w-lg">
            $ Google {'('}2023{')'} Why Red Teams Play a Central Role in Helping Organizations Secure AI Systems
        </a>

        <br></br>
        <a href = "https://www.promptfoo.dev/blog/how-to-jailbreak-llms/"
        className = "text-[#ff3131] font-mono text-l whitespace-pre-wrap break-words neon-hover-red w-full max-w-lg">
            $ Ian Webster (2025). How to Jailbreak LLMs.
        </a>            

    </div>
    )
}