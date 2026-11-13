import React from 'react'


const page = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">


      <a href='/signin' className="bg-black cursor-pointer hover:bg-black/80 disabled:cursor-wait disabled:opacity-70 text-white text-md p-1 px-4 rounded-full font-semibold">

        Sign in
      </a>
    </div>
  );
}

export default page
