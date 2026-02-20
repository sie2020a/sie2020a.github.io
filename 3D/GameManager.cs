using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using UnityEngine.SceneManagement;

public class GameManager : MonoBehaviour
{
    public TextMeshProUGUI timerText;
    public GameObject retryButton;
    public bool goal;

    GameObject[] objects;
    float time = 0;

    void Start()
    {
        timerText = timerText.GetComponent<TextMeshProUGUI>();
        if (retryButton != null) retryButton.SetActive(false);
        goal = false;
    }

    void Update()
    {
        if (goal == false)
        {
            time += Time.deltaTime;
        }

        objects = GameObject.FindGameObjectsWithTag("Obj");
        if (objects.Length == 0)
        {
            goal = true;
            if (retryButton != null) retryButton.SetActive(true);
        }

        int currentTime = Mathf.FloorToInt(time);
        timerText.text = "Time: " + currentTime.ToString();
    }

    public void ReloadScene()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }
}
