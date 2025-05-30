import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import { useCookies } from 'react-cookie';
import { Link } from 'react-router-dom';

import { Header } from '../components/Header';
import { url } from '../const';
import './home.scss';

export const Home = () => {
  const [isDoneDisplay, setIsDoneDisplay] = useState('todo'); // todo->未完了 done->完了
  const [lists, setLists] = useState([]);
  const [selectListId, setSelectListId] = useState();
  const [tasks, setTasks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [cookies] = useCookies();
  const tabRefs = useRef([]);
  const handleIsDoneDisplayChange = (e) => setIsDoneDisplay(e.target.value);
  useEffect(() => {
    axios
      .get(`${url}/lists`, {
        headers: {
          authorization: `Bearer ${cookies.token}`,
        },
      })
      .then((res) => {
        setLists(res.data);
      })
      .catch((err) => {
        setErrorMessage(`リストの取得に失敗しました。${err}`);
      });
  }, []);

  useEffect(() => {
    const listId = lists[0]?.id;
    if (typeof listId !== 'undefined') {
      setSelectListId(listId);
      axios
        .get(`${url}/lists/${listId}/tasks`, {
          headers: {
            authorization: `Bearer ${cookies.token}`,
          },
        })
        .then((res) => {
          setTasks(res.data.tasks);
        })
        .catch((err) => {
          setErrorMessage(`タスクの取得に失敗しました。${err}`);
        });
    }
  }, [lists]);

  const selectAndFocus = (idx) => {
    const id = lists[idx].id;
    setSelectListId(id);           
    axios.get(`${url}/lists/${id}/tasks`, { headers: { authorization: `Bearer ${cookies.token}` } })
      .then((res) => setTasks(res.data.tasks))
      .catch((err) => setErrorMessage(`タスクの取得に失敗しました。${err}`));
    tabRefs.current[idx]?.focus(); 
  };

  const onTabKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      selectAndFocus(idx);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (idx + 1 < lists.length) selectAndFocus(idx + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (idx - 1 >= 0) selectAndFocus(idx - 1);
    }
  };

  return (
    <div>
      <Header />
      <main className="taskList">
        <p className="error-message">{errorMessage}</p>
        <div>
          <div className="list-header">
            <h2>リスト一覧</h2>
            <div className="list-menu">
              <p>
                <Link to="/list/new">リスト新規作成</Link>
              </p>
              <p>
                <Link to={`/lists/${selectListId}/edit`}>選択中のリストを編集</Link>
              </p>
            </div>
          </div>
          <ul className="list-tab" role="tablist">
            {lists.map((list, idx) => {
              const isActive = list.id === selectListId;
              return (
                <li
                  key={list.id}
                  ref={(el) => (tabRefs.current[idx] = el)}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}              
                  className={`list-tab-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectAndFocus(idx)}
                  onKeyDown={(e) => onTabKeyDown(e, idx)}
                >
                  {list.title}
                </li>
              );
            })}
          </ul>
          <div className="tasks">
            <div className="tasks-header">
              <h2>タスク一覧</h2>
              <Link to="/task/new">タスク新規作成</Link>
            </div>
            <div className="display-select-wrapper">
              <select 
                onChange={handleIsDoneDisplayChange} 
                className="display-select"
                aria-label="タスクの表示切り替え"
              >
                <option value="todo">未完了</option>
                <option value="done">完了</option>
              </select>
            </div>
            <Tasks tasks={tasks} selectListId={selectListId} isDoneDisplay={isDoneDisplay} />
          </div>
        </div>
      </main>
    </div>
  );
};

// 表示するタスク
// 残り時間を計算する関数
const calculateRemainingTime = (deadline) => {
  if (!deadline) return null;

  const now = new Date();
  const limitDate = new Date(deadline);
  const diff = limitDate - now;

  if (diff < 0) return '期限切れ';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return `残り ${days}日${hours}時間${minutes}分`;
};

const Tasks = (props) => {
  const { tasks, selectListId, isDoneDisplay } = props;
  if (tasks === null) return <></>;

  if (isDoneDisplay == 'done') {
    return (
      <ul role="list">
        {tasks
          .filter((task) => {
            return task.done === true;
          })
          .map((task, key) => (
            <li key={key} className="task-item" role="listitem">
              <Link 
                to={`/lists/${selectListId}/tasks/${task.id}`} 
                className="task-item-link"
                aria-label={`${task.title} ${task.done ? '完了' : '未完了'} ${task.limit ? `期限: ${new Date(task.limit).toLocaleString('ja-JP')} ${calculateRemainingTime(task.limit)}` : ''}`}
              >
                {task.title}
                <br />
                {task.done ? '完了' : '未完了'}
                {task.limit && (
                  <>
                    <br />
                    期限: {new Date(task.limit).toLocaleString('ja-JP')}
                    <br />
                    {calculateRemainingTime(task.limit)}
                  </>
                )}
              </Link>
            </li>
          ))}
      </ul>
    );
  }

  return (
    <ul role="list">
      {tasks
        .filter((task) => {
          return task.done === false;
        })
        .map((task, key) => (
          <li key={key} className="task-item" role="listitem">
              <Link 
                to={`/lists/${selectListId}/tasks/${task.id}`} 
                className="task-item-link"
                aria-label={`${task.title} ${task.done ? '完了' : '未完了'} ${task.limit ? `期限: ${new Date(task.limit).toLocaleString('ja-JP')} ${calculateRemainingTime(task.limit)}` : ''}`}
              >
              {task.title}
              <br />
              {task.done ? '完了' : '未完了'}
              {task.limit && (
                <>
                  <br />
                  期限: {new Date(task.limit).toLocaleString('ja-JP')}
                  <br />
                  {calculateRemainingTime(task.limit)}
                </>
              )}
            </Link>
          </li>
        ))}
    </ul>
  );
};
