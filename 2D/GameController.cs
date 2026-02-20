using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

public class GameController : MonoBehaviour
{
    public GameObject clearUi;

    void Start()
    {
        clearUi.SetActive(false);
        Score.score = 0;
    }

    void Update()
    {
        if (Score.score >= 10)
        {
            clearUi.SetActive(true);
        }
    }

    public void ReloadGame()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
        Score.score = 0;
    }
}
